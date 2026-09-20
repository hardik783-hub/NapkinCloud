require("../loadEnv");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const archiver = require("archiver");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const {
  CloudFormationClient,
  CreateStackCommand,
  DescribeStacksCommand,
  waitUntilStackCreateComplete,
} = require("@aws-sdk/client-cloudformation");

const REGION = process.env.AWS_REGION || "us-east-1";

const BUCKET = process.env.NAPKIN_S3_BUCKET || "aws-sam-cli-managed-default-samclisourcebucket-67tausw1jwyw";

const s3 = new S3Client({
  region: REGION,
});

const cloudformation = new CloudFormationClient({
  region: REGION,
});

function createLambdaZip(lambdaPath, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    output.on("close", () => {
      console.log(`📦 Lambda ZIP created: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on("error", reject);

    archive.pipe(output);

    archive.file(lambdaPath, {
      name: "index.js",
    });

    archive.finalize();
  });
}

async function deployStack(stackName, templatePath) {
  console.log("🚀 Starting NapkinCloud deployment...");

  // 1. Locate generated Lambda
  const lambdaPath = path.join(
    path.dirname(templatePath),
    "functions",
    "generated",
    "index.js",
  );

  if (!fs.existsSync(lambdaPath)) {
    throw new Error(`Lambda file not found: ${lambdaPath}`);
  }

  const zipPath = path.join(path.dirname(lambdaPath), "lambda.zip");

  await createLambdaZip(lambdaPath, zipPath);

  const lambdaKey = `napkincloud/${stackName}/lambda/lambda.zip`;

  console.log("📦 Uploading Lambda ZIP to S3...");

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: lambdaKey,
        Body: fs.createReadStream(zipPath),
        ContentType: "application/zip",
      }),
    );
  } catch (s3Error) {
    throw new Error(
      `S3 Upload failed to bucket '${BUCKET}': ${s3Error.message || s3Error}. (Check AWS credentials or S3 bucket permissions)`
    );
  }

  console.log("✅ Lambda ZIP uploaded");

  console.log("✅ Lambda uploaded");

  // 3. Read generated SAM template
  const templateText = fs.readFileSync(templatePath, "utf8");

  // 4. Parse YAML
  const template = yaml.load(templateText);

  // 5. Find Lambda resource
  const resources = template.Resources;

  if (!resources) {
    throw new Error("Generated template has no Resources");
  }

  let lambdaResource = null;

  for (const resource of Object.values(resources)) {
    if (resource.Type === "AWS::Serverless::Function") {
      lambdaResource = resource;
      break;
    }
  }

  if (!lambdaResource) {
    throw new Error("No Lambda function found in template");
  }

  // 6. Replace CodeUri with S3 location
  lambdaResource.Properties.CodeUri = `s3://${BUCKET}/${lambdaKey}`;

  // 7. Convert back to YAML
  const finalTemplate = yaml.dump(template, {
    noRefs: true,
  });

  // 8. Deploy CloudFormation
  console.log("☁️ Creating CloudFormation stack...");

  try {
    await cloudformation.send(
      new CreateStackCommand({
        StackName: stackName,

        TemplateBody: finalTemplate,

        Capabilities: [
          "CAPABILITY_IAM",
          "CAPABILITY_NAMED_IAM",
          "CAPABILITY_AUTO_EXPAND",
        ],

        OnFailure: "DO_NOTHING",
      }),
    );
  } catch (cfError) {
    throw new Error(
      `CloudFormation stack creation failed for '${stackName}': ${cfError.message || cfError}. (Check IAM permissions)`
    );
  }

  console.log("⏳ Waiting for AWS deployment...");

  // 9. Wait
  await waitUntilStackCreateComplete(
    {
      client: cloudformation,
      maxWaitTime: 900,
    },
    {
      StackName: stackName,
    },
  );

  // 10. Get outputs
  const result = await cloudformation.send(
    new DescribeStacksCommand({
      StackName: stackName,
    }),
  );

  const stack = result.Stacks[0];

  const outputs = {};

  for (const output of stack.Outputs || []) {
    outputs[output.OutputKey] = output.OutputValue;
  }

  console.log("✅ NapkinCloud deployment successful!");

  return {
    stackName,
    status: stack.StackStatus,
    outputs,
  };
}

module.exports = {
  deployStack,
};

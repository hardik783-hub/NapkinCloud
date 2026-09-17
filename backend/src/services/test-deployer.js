const path = require("path");

const { deployStack } = require("./deployer");

const templatePath = path.join(
  __dirname,
  "../../../infrastructure/generated-template.yaml",
);

const stackName = "napkincloud-generated-test";

deployStack(stackName, templatePath)
  .then((result) => {
    console.log("\n🎉 DEPLOYMENT COMPLETE");
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED");
    console.error(error.message);
  });

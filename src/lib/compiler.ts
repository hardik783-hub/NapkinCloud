import type { NormalizedArchitecture } from '@/types/compiler';

export function compileSamTemplate(
  normArch: NormalizedArchitecture,
  projectId: string = 'napkin-p0'
): string {
  const { api, lambda, dynamodb } = normArch;

  const safeProjectName = projectId.replace(/[^a-zA-Z0-9]/g, '');
  const cleanFnLogicalId = `${lambda.functionName.replace(/[^a-zA-Z0-9]/g, '')}Fn`;
  const cleanTableLogicalId = `${dynamodb.tableName.replace(/[^a-zA-Z0-9]/g, '')}Table`;
  const path = api.path.startsWith('/') ? api.path : `/${api.path}`;
  const method = api.method.toUpperCase();

  return `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: NapkinCloud — Auto-generated serverless stack for project ${safeProjectName}

Globals:
  Function:
    Timeout: 15
    MemorySize: 256
    Runtime: ${lambda.runtime}
  HttpApi:
    CorsConfiguration:
      AllowOrigins:
        - "'*'"
      AllowHeaders:
        - "'*'"
      AllowMethods:
        - "'*'"

Resources:
  HttpApiGateway:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: prod

  ${cleanFnLogicalId}:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "\${AWS::StackName}-${lambda.functionName}"
      Handler: index.handler
      CodeUri: ./
      Environment:
        Variables:
          TABLE_NAME: !Ref ${cleanTableLogicalId}
          PROJECT_ID: "${safeProjectName}"
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ${cleanTableLogicalId}
      Events:
        ApiRouteTrigger:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApiGateway
            Path: ${path}
            Method: ${method}

  ${cleanTableLogicalId}:
    Type: AWS::Serverless::SimpleTable
    Properties:
      TableName: !Sub "\${AWS::StackName}-${dynamodb.tableName}"
      PrimaryKey:
        Name: ${dynamodb.partitionKey}
        Type: ${dynamodb.partitionKeyType}

Outputs:
  ApiEndpoint:
    Description: Live API Gateway Endpoint URL
    Value: !Sub "https://\${HttpApiGateway}.execute-api.\${AWS::Region}.amazonaws.com/prod${path}"
  FunctionName:
    Description: Deployed Lambda Function
    Value: !Ref ${cleanFnLogicalId}
  TableName:
    Description: Deployed DynamoDB Table
    Value: !Ref ${cleanTableLogicalId}
  HttpApiId:
    Description: HTTP API Gateway Resource ID
    Value: !Ref HttpApiGateway
`;
}

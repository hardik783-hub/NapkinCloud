export const STATIC_KNOWN_GOOD_SAM_TEMPLATE = `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: NapkinCloud Generated Serverless Backend (P0 Core Pattern)

Globals:
  Function:
    Timeout: 15
    MemorySize: 256
    Runtime: nodejs20.x
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

  BackendFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      CodeUri: ./
      Environment:
        Variables:
          TABLE_NAME: !Ref DataTable
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref DataTable
      Events:
        ApiTrigger:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApiGateway
            Path: /orders
            Method: POST

  DataTable:
    Type: AWS::Serverless::SimpleTable
    Properties:
      PrimaryKey:
        Name: orderId
        Type: String

Outputs:
  ApiEndpoint:
    Description: HTTP API Gateway Endpoint URL
    Value: !Sub "https://\${HttpApiGateway}.execute-api.\${AWS::Region}.amazonaws.com/prod/orders"
  FunctionName:
    Description: Lambda Function Name
    Value: !Ref BackendFunction
  TableName:
    Description: DynamoDB Table Name
    Value: !Ref DataTable
`;

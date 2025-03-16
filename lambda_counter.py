import json
import boto3
import os
dynamodb = boto3.client("dynamodb")
table_name = "db-visit-count"

def lambda_handler(event, context):
    body = None
    status_code = 200
    headers = {
        "Content-Type": "application/json"
    }
    visit_count: int = 0
    try:
        route_key = event["routeKey"]
        
        if route_key == "GET /items/{user}":

            #get current visit count
            response = dynamodb.get_item(
                TableName=table_name,
                Key={
                    "user": {"S": event["pathParameters"]["user"]}
                }
            )

            #extract count
            if "Item" in response:
                visit_count = int(response.get('Item',{}).get('count',{}).get('N'))

            #increment count
            visit_count += 1
            message = f"Visit count is {visit_count}"
            
            #reconstruct Item 
            item = {"user": {"S": event["pathParameters"]["user"]}, "count": {} }
            item['count']['N'] = str(visit_count)

            #write visit-count back to dynamodb
            dynamodb.put_item(
                TableName=table_name,
                Item = item
            )
            body = message
        
        else:
            raise Exception(f"Unsupported route: {route_key}")
    except Exception as e:
        status_code = 400
        body = str(e)
    finally:
        body = json.dumps(body)
    return {
        "statusCode": status_code,
        "body": body,
        "headers": headers
    }


    
# DynamoDB setup

Create these tables in `ap-south-1`.

## `mine-nodes`

- Partition key: `node_id` (String)
- Stores one current item per node.

## `mine-telemetry-history`

- Partition key: `node_id` (String)
- Sort key: `received_at` (String)
- Stores every analyzed telemetry window.

## IoT Rule

Use the SQL in `aws/iot-rule.sql` and configure the rule action to invoke the deployed `telemetry-handler` Lambda.

## Lambda environment variables

```text
DYNAMODB_NODES_TABLE=mine-nodes
DYNAMODB_HISTORY_TABLE=mine-telemetry-history
AWS_REGION=ap-south-1
```

The Lambda execution role needs `dynamodb:PutItem` on both tables. The IoT rule role needs permission to invoke the Lambda. Do not put AWS access keys in Next.js browser code or in the Raspberry Pi source.

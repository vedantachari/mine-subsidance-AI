# Mine Subsidence Dashboard

## Gateway telemetry integration

The admin app accepts normalized or compact gateway telemetry at:

```text
POST /api/telemetry
Content-Type: application/json
```

Example payload:

```json
{
	"n": "NODE_024",
	"la": 18.6007,
	"lo": 73.9306,
	"r": 0.82,
	"p": 0.44,
	"v": 0.041,
	"pk": 0.12,
	"pp": 0.19,
	"f": 18.36,
	"rssi": -67,
	"snr": 8.2,
	"battery": 87,
	"received_at": "2026-09-06T08:10:15Z"
}
```

The server keeps a per-node detector state and calculates tilt magnitude/change, z-scores, EWMA, CUSUM, persistence, risk score, and status. The dashboard and map poll `/api/dashboard` and `/api/nodes` every five seconds.

The current route is the application ingestion boundary. An AWS IoT subscriber or IoT Rule/Lambda should validate the gateway MQTT message and forward the same JSON contract to this endpoint. AWS certificates and private keys must stay outside the Next.js browser bundle.

## Raspberry Pi gateway

Install the gateway dependencies from `gateway/requirements.txt`, then configure the Pi with:

```bash
export WEBSITE_API_URL="http://YOUR_COMPUTER_LAN_IP:3000"
export WEBSITE_API_TOKEN="use-the-same-private-token-as-the-website"
python gateway.py
```

The gateway continues publishing to AWS IoT and asynchronously forwards each accepted LoRa packet to the website. Configure `WEBSITE_API_TOKEN` in the Next.js server environment as well. Do not expose this token in browser code.

## AWS cloud mode

The app supports a cloud mode without changing the frontend components. Keep `AWS_DYNAMODB_ENABLED=false` while testing locally. After AWS resources exist, add these server-only values to `.env.local`:

```env
AWS_DYNAMODB_ENABLED=true
AWS_REGION=ap-south-1
DYNAMODB_NODES_TABLE=mine-nodes
DYNAMODB_HISTORY_TABLE=mine-telemetry-history
```

The Next.js server must run with an AWS IAM role or environment credentials that allow `dynamodb:Scan` and `dynamodb:GetItem` on `mine-nodes`, plus `dynamodb:Query` on `mine-telemetry-history`. Never put AWS credentials in client components.

### Provision AWS

1. In DynamoDB, create `mine-nodes` with partition key `node_id` (String).
2. Create `mine-telemetry-history` with partition key `node_id` (String) and sort key `received_at` (String).
3. Deploy `aws/lambda/telemetry-handler.ts` as a Lambda function. Bundle it with the AWS SDK and the shared `src/lib/subsidence-engine.ts` module, or deploy it from an infrastructure pipeline.
4. Give the Lambda role `dynamodb:PutItem` on both tables.
5. Create an AWS IoT Rule using `aws/iot-rule.sql`:

	```sql
	SELECT * FROM 'mine/gateway/nodes/+/telemetry'
	```

6. Give the IoT rule permission to invoke the Lambda.
7. Start the gateway. It publishes MQTT data to AWS; the rule invokes Lambda; Lambda analyzes and stores it.
8. Restart Next.js after setting `.env.local` with `npm run dev:network`.

The website then reads current nodes from `mine-nodes` and history from `mine-telemetry-history`. The local `/api/telemetry` bridge remains available for LAN testing, but it is not required in cloud mode.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

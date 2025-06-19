import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { shopify } from "../shopify.server";

export const action = async ({ request, context }: ActionFunctionArgs) => {
    const { topic, shop, payload } = await shopify(context).authenticate.webhook(request);
    console.log(`Received ${topic} webhook (CUSTOMERS_DATA_REQUEST) for ${shop}`, payload);
    // Tutaj możesz dodać obsługę żądania danych klienta
    return new Response();
}; 
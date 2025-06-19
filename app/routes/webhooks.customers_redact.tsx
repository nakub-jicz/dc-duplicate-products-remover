import type { ActionFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";

export const action = async ({ request, context }: ActionFunctionArgs) => {
    const { topic, shop, payload } = await shopify(context).authenticate.webhook(request);
    console.log(`Received ${topic} webhook (CUSTOMERS_REDACT) for ${shop}`, payload);
    // Tutaj możesz dodać obsługę usunięcia danych klienta
    return new Response();
}; 
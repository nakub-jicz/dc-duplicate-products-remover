import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { shopify } from "../shopify.server";

export const action = async ({ request, context }: ActionFunctionArgs) => {
    const { topic, shop, payload } = await shopify(context).authenticate.webhook(request);
    console.log(`Received ${topic} webhook (SHOP_REDACT) for ${shop}`, payload);
    // Tutaj możesz dodać obsługę usunięcia danych sklepu
    return new Response();
}; 
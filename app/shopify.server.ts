import "@shopify/shopify-app-remix/adapters/node";
import {
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
  LATEST_API_VERSION
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-01";
import { PrismaClient } from "@prisma/client/edge";
import type { AppLoadContext } from "@remix-run/cloudflare";

export const shopify = (context: AppLoadContext) => {
  const prismaClient = new PrismaClient({
    datasourceUrl: context.cloudflare.env.DATABASE_URL,
  });

  return shopifyApp({
    apiKey: context.cloudflare.env.SHOPIFY_API_KEY,
    apiSecretKey: context.cloudflare.env.SHOPIFY_API_SECRET || "",
    apiVersion: LATEST_API_VERSION,
    scopes: context.cloudflare.env.SCOPES?.split(","),
    appUrl: context.cloudflare.env.SHOPIFY_APP_URL || "",
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorage(prismaClient),
    distribution: AppDistribution.AppStore,
    restResources,
    webhooks: {
      APP_UNINSTALLED: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks",
      },
    },
    hooks: {
      afterAuth: async ({ session }) => {
        shopify(context).registerWebhooks({ session });
      },
    },
    isEmbeddedApp: true,
    future: {
      unstable_newEmbeddedAuthStrategy: true,
    },
  });
};

export default shopify;
export const apiVersion = LATEST_API_VERSION;

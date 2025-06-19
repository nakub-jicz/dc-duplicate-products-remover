import { flatRoutes } from "@remix-run/fs-routes";
import { type LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";

export default flatRoutes();

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);

    // Jeśli jesteśmy w iframe Shopify, użyj specjalnego redirecta
    if (url.searchParams.has("embedded")) {
        return redirect("/app/sku");
    }

    // W przeciwnym razie użyj standardowego redirecta
    return redirect("/sku");
}

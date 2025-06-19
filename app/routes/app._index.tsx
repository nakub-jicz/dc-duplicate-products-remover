// app/routes/app._index.tsx

import { useEffect, useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Frame, Toast } from "@shopify/polaris";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

import { shopify } from "../shopify.server";
import { UsuwaczUI } from "../components/UsuwaczUI";
import {
  pobierzWszystkieProdukty,
  znajdzWskazDuplikaty,
  usunWybraneProdukty,
  usunProduktIZaktualizujGrupe
} from "../services/produkty.server";

// Loader. Woła serwis, dostaje dane, zwraca. Koniec pierdolenia.
export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);
  const url = new URL(request.url);

  // Wyszukujemy, jaki tab jest aktywny. Jeśli nie ma, to domyślnie 'tytul'.
  const aktywnyTab = url.searchParams.get('tab') || 'tytul';

  // Niech nasz serwis zrobi całą brudną robotę.
  const produkty = await pobierzWszystkieProdukty(admin as AdminApiContext);

  // Teraz, kiedy mamy produkty, pogrupujmy je według aktywnego taba.
  const grupyDuplikatow = znajdzWskazDuplikaty(produkty, aktywnyTab);

  // Generujemy statystyki
  const statystyki = {
    liczbaProduktow: produkty.length,
    liczbaGrupDuplikatow: grupyDuplikatow.length,
    liczbaKlonowDoUsuniecia: grupyDuplikatow.reduce(
      (suma, grupa) => suma + grupa.duplikatyDoUsuniecia.length,
      0
    ),
  };

  // Zwracamy pogrupowane duplikaty, aktywny tab i statystyki
  return json({
    grupyDuplikatow,
    aktywnyTab,
    statystyki
  });
};

// Action. Sprawdza, co ma zrobić i deleguje do serwisu.
export async function action({ request, context }: ActionFunctionArgs) {
  const { admin } = await shopify(context).authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get('_action');
  const url = new URL(request.url);
  const aktywnyTab = url.searchParams.get('tab') || 'tytul';

  if (action === 'usun') {
    const idDoUsuniecia = formData.getAll('idDoUsuniecia[]');
    await usunWybraneProdukty(admin as AdminApiContext, idDoUsuniecia as string[]);
    return redirect(`/app?tab=${aktywnyTab}`);
  }

  if (action === 'usun_oryginal') {
    const idGrupy = formData.get('idGrupy') as string;

    // Pobieramy aktualne dane
    const produkty = await pobierzWszystkieProdukty(admin as AdminApiContext);
    const grupyDuplikatow = znajdzWskazDuplikaty(produkty, aktywnyTab);

    // Znajdujemy odpowiednią grupę
    const grupa = grupyDuplikatow.find(g => g.oryginal.id === idGrupy);

    if (grupa) {
      // Usuwamy oryginał i aktualizujemy grupę
      await usunProduktIZaktualizujGrupe(admin as AdminApiContext, idGrupy, grupa);
    }

    return redirect(`/app?tab=${aktywnyTab}`);
  }

  return redirect(`/app?tab=${aktywnyTab}`);
}

// Komponent Kontroler. Spina wszystko w całość. Jest klejem.
export default function StronaUsuwacza() {
  const { grupyDuplikatow, aktywnyTab, statystyki } = useLoaderData<typeof loader>();
  const nawigacja = useNavigation();
  const [searchParams] = useSearchParams();
  const app = useAppBridge();

  const czyUsunieto = searchParams.get('usunieto') === 'true';
  const czyApkaMieliDane = nawigacja.state === 'loading' || nawigacja.state === 'submitting';

  const [showToast, setShowToast] = useState(czyUsunieto);

  useEffect(() => {
    if (czyUsunieto) {
      setShowToast(true);
    }
  }, [czyUsunieto]);

  return (
    <Frame>
      <UsuwaczUI
        grupyDuplikatow={grupyDuplikatow}
        czyApkaMieliDane={czyApkaMieliDane}
        aktywnyTab={aktywnyTab}
        statystyki={statystyki}
      />
      {showToast && (
        <Toast
          content="Cele zostały zneutralizowane. Dobra robota."
          duration={5000}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </Frame>
  );
}
// app/routes/app._index.tsx

import { useEffect, useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Frame, Toast } from "@shopify/polaris";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

import { authenticate } from "../shopify.server";
import { AnihilatorUI } from "../components/UsuwaczUI";
import {
  pobierzWszystkieProdukty,
  znajdzWskazDuplikaty,
  usunWybraneProdukty
} from "../services/produkty.server";

// Loader. Woła serwis, dostaje dane, zwraca. Koniec pierdolenia.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  // Wyszukujemy, czy user chce szukać po czymś konkretnym. Jeśli nie, to domyślnie bierzemy 'tytul'.
  const kryteriaParam = url.searchParams.get('kryteria') || 'tytul';

  // Niech nasz serwis zrobi całą brudną robotę.
  const produkty = await pobierzWszystkieProdukty(admin as AdminApiContext);

  // Teraz, kiedy mamy produkty, pogrupujmy je.
  // @ts-ignore - na razie olewamy, bo kryterium jest na sztywno, ale to do rozbudowy
  const grupyDuplikatow = znajdzWskazDuplikaty(produkty);

  // Zwracamy pogrupowane duplikaty i kryteria, po których szukaliśmy, do komponentu UI.
  return json({ grupyDuplikatow, kryteriaPoczatkowe: kryteriaParam.split(',') });
};

// Action. Sprawdza, co ma zrobić i deleguje do serwisu.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get('_action');

  switch (actionType) {
    // AKCJA 'ZNAJDŹ' - Użytkownik chce odświeżyć listę z nowymi kryteriami
    case 'znajdz': {
      const kryteria = formData.getAll('kryteria').join(',');
      const params = new URLSearchParams();
      if (kryteria) {
        params.set('kryteria', kryteria);
      }
      // Robimy przekierowanie z nowymi parametrami w URL, co z automatu odpali `loader` na nowo.
      return redirect(`/app?${params.toString()}`);
    }

    // AKCJA 'USUŃ' - Czas na rozpierdol
    case 'usun': {
      const idDoUsuniecia = formData.getAll('idDoUsuniecia[]').map(String);
      if (idDoUsuniecia.length > 0) {
        // Delegujemy zadanie anihilacji do naszego serwisu.
        await usunWybraneProdukty(admin as AdminApiContext, idDoUsuniecia);
        // Przekierowujemy z flagą, żeby pokazać powiadomienie o sukcesie.
        return redirect('/app?usunieto=true');
      }
      // Jak ktoś wysłał pusty formularz, to go olej.
      return json({ error: 'Nie wybrano żadnych produktów do usunięcia.' });
    }

    default:
      return json({ error: 'Nieznana akcja, nie próbuj mnie hackować, gnoju.' }, { status: 400 });
  }
};

// Komponent Kontroler. Spina wszystko w całość. Jest klejem.
export default function StronaUsuwacza() {
  const { grupyDuplikatow, kryteriaPoczatkowe } = useLoaderData<typeof loader>();
  const nawigacja = useNavigation();
  const [searchParams] = useSearchParams();
  const app = useAppBridge();

  const czyUsunieto = searchParams.get('usunieto') === 'true';
  const czyApkaMieliDane = nawigacja.state === 'loading' || nawigacja.state === 'submitting';

  // Polaris Toast state
  const [showToast, setShowToast] = useState(czyUsunieto);

  useEffect(() => {
    if (czyUsunieto) {
      setShowToast(true);
    }
  }, [czyUsunieto]);

  return (
    <Frame>
      <AnihilatorUI
        grupyDuplikatow={grupyDuplikatow}
        czyApkaMieliDane={czyApkaMieliDane}
        kryteriaPoczatkowe={kryteriaPoczatkowe}
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
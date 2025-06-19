// app/services/produkty.server.ts

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import type { ProduktInfo, GrupaZduplikowanychProduktow } from "../types/produkty";

const POBIERZ_PRODUKTY_QUERY = `#graphql
  query ($kursor: String) {
    products(first: 100, after: $kursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          createdAt
          featuredImage {
            url(transform: {maxWidth: 60, maxHeight: 60})
          }
        }
      }
    }
  }`;

const USUN_PRODUKT_MUTATION = `#graphql
  mutation usunProdukt($id: ID!) {
    productDelete(input: {id: $id}) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }`;

export function znajdzWskazDuplikaty(produkty: ProduktInfo[]): GrupaZduplikowanychProduktow[] {
  const grupyTymczasowe: { [klucz: string]: ProduktInfo[] } = {};

  // Krok 1: Grupujemy tak jak wcześniej.
  for (const produkt of produkty) {
    const klucz = produkt.tytul.trim().toLowerCase();
    if (!grupyTymczasowe[klucz]) {
      grupyTymczasowe[klucz] = [];
    }
    grupyTymczasowe[klucz].push(produkt);
  }

  const wynikKoncowy: GrupaZduplikowanychProduktow[] = [];

  // Krok 2: Przetwarzamy każdą grupę, która ma więcej niż 1 produkt.
  for (const klucz in grupyTymczasowe) {
    const grupa = grupyTymczasowe[klucz];
    if (grupa.length > 1) {
      // Sortujemy produkty w grupie od najstarszego do najnowszego. Czysta władza.
      const posortowanaGrupa = [...grupa].sort(
        (a, b) => new Date(a.dataUtworzenia).getTime() - new Date(b.dataUtworzenia).getTime()
      );

      const [oryginal, ...duplikaty] = posortowanaGrupa;

      wynikKoncowy.push({
        oryginal: oryginal,
        duplikatyDoUsuniecia: duplikaty,
      });
    }
  }

  return wynikKoncowy;
}

/**
 * Zapierdala przez wszystkie produkty sklepu z paginacją, dopóki nie zbierze każdego.
 * To jest, kurwa, koń pociągowy tej aplikacji.
 */
export async function pobierzWszystkieProdukty(admin: AdminApiContext): Promise<ProduktInfo[]> {
  let wszystkieProdukty: ProduktInfo[] = [];
  let kursor: string | null = null;
  let maNastepnaStrone = true;

  console.log("Rozpoczynam pobieranie produktów... To może chwilę potrwać, nie panikuj.");

  while (maNastepnaStrone) {
    const odpowiedz = await admin.graphql(POBIERZ_PRODUKTY_QUERY, { variables: { kursor } });
    const dane: any = await odpowiedz.json();

    if (!dane.data?.products) {
      throw new Error("API Shopify zwróciło jakieś gówno zamiast produktów. Sprawdź uprawnienia.");
    }

    const krawedzie = dane.data.products.edges;

    const zmapowaneProdukty = krawedzie.map((krawedz: any) => ({
      id: krawedz.node.id,
      tytul: krawedz.node.title,
      urlObrazka: krawedz.node.featuredImage?.url,
      dataUtworzenia: krawedz.node.createdAt,
    }));

    wszystkieProdukty = [...wszystkieProdukty, ...zmapowaneProdukty];

    maNastepnaStrone = dane.data.products.pageInfo.hasNextPage;
    kursor = dane.data.products.pageInfo.endCursor;
    console.log(`Pobrano ${wszystkieProdukty.length} produktów... Dalej!`);
  }

  console.log("Zakończono pobieranie. Zebrano łącznie: ", wszystkieProdukty.length);
  return wszystkieProdukty;
}

/**
 * Grupuje zebrane produkty wg podanego kryterium (np. 'tytul').
 * To jest mózg analityczny operacji.
 */
export function pogrupujProdukty(produkty: ProduktInfo[], kryterium: 'tytul' | string): GrupaZduplikowanychProduktow[] {
  const grupy = produkty.reduce<GrupaZduplikowanychProduktow[]>((akumulator, produkt) => {
    // Na razie prosta obsługa tylko dla tytułu. Można to rozbudować.
    const klucz = produkt.tytul.trim().toLowerCase();

    if (!akumulator.find(g => g.oryginal.tytul === klucz)) {
      akumulator.push({
        oryginal: produkt,
        duplikatyDoUsuniecia: [],
      });
    }
    akumulator.find(g => g.oryginal.tytul === klucz)?.duplikatyDoUsuniecia.push(produkt);
    return akumulator;
  }, [] as GrupaZduplikowanychProduktow[]);

  // Filtrujemy, żeby zostawić tylko te grupy, gdzie jest co anihilować (więcej niż 1 produkt)
  return grupy.filter(g => g.duplikatyDoUsuniecia.length > 1);
}

/**
 * Wysyła pluton egzekucyjny. Kasuje produkty bez zbędnych pytań.
 */
export async function usunWybraneProdukty(admin: AdminApiContext, idDoUsuniecia: string[]): Promise<void> {
  console.log(`Odebrano rozkaz anihilacji dla ${idDoUsuniecia.length} produktów.`);
  // Ograniczenie ryzyka: Użycie Promise.allSettled zamiast .all, żeby jeden błąd nie wyjebał całej operacji
  const wyniki = await Promise.allSettled(
    idDoUsuniecia.map(id => admin.graphql(USUN_PRODUKT_MUTATION, { variables: { id } }))
  );

  wyniki.forEach((wynik, index) => {
    if (wynik.status === 'rejected') {
      console.error(`Nie udało się usunąć produktu o ID: ${idDoUsuniecia[index]}`, wynik.reason);
    } else {
      console.log(`Produkt ${idDoUsuniecia[index]} anihilowany pomyślnie.`);
    }
  })
}
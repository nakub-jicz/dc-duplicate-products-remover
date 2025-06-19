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
          vendor
          createdAt
          featuredImage {
            url(transform: {maxWidth: 60, maxHeight: 60})
          }
          variants(first: 250) {
            edges {
              node {
                id
                sku
                barcode
              }
            }
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

export function znajdzWskazDuplikaty(produkty: ProduktInfo[], kryterium: string): GrupaZduplikowanychProduktow[] {
  switch (kryterium) {
    case 'tytul':
      return znajdzDuplikatyPoTytule(produkty);
    case 'sku':
      return znajdzDuplikatyPoSKU(produkty);
    case 'tytul_sku':
      return znajdzDuplikatyPoTytuleISKU(produkty);
    case 'vendor':
      return znajdzDuplikatyPoVendorze(produkty);
    default:
      throw new Error(`Nieznane kryterium: ${kryterium}`);
  }
}

function znajdzDuplikatyPoTytule(produkty: ProduktInfo[]): GrupaZduplikowanychProduktow[] {
  const grupyTymczasowe: { [klucz: string]: ProduktInfo[] } = {};

  for (const produkt of produkty) {
    const klucz = produkt.tytul.trim().toLowerCase();
    if (!grupyTymczasowe[klucz]) {
      grupyTymczasowe[klucz] = [];
    }
    grupyTymczasowe[klucz].push(produkt);
  }

  return przetworzGrupy(grupyTymczasowe, 'tytul');
}

function znajdzDuplikatyPoSKU(produkty: ProduktInfo[]): GrupaZduplikowanychProduktow[] {
  const mapaSKU: { [sku: string]: ProduktInfo[] } = {};

  // Iterujemy po wszystkich produktach i ich wariantach
  for (const produkt of produkty) {
    if (produkt.variants) {
      for (const wariant of produkt.variants) {
        if (wariant.sku && wariant.sku.trim()) {
          const sku = wariant.sku.trim().toLowerCase();
          if (!mapaSKU[sku]) {
            mapaSKU[sku] = [];
          }
          mapaSKU[sku].push(produkt);
        }
      }
    }
  }

  return przetworzGrupy(mapaSKU, 'sku');
}

function znajdzDuplikatyPoTytuleISKU(produkty: ProduktInfo[]): GrupaZduplikowanychProduktow[] {
  const mapaZlozona: { [klucz: string]: ProduktInfo[] } = {};

  for (const produkt of produkty) {
    if (produkt.variants) {
      for (const wariant of produkt.variants) {
        if (wariant.sku && wariant.sku.trim()) {
          const klucz = produkt.tytul.trim().toLowerCase() + '|' + wariant.sku.trim().toLowerCase();
          if (!mapaZlozona[klucz]) {
            mapaZlozona[klucz] = [];
          }
          mapaZlozona[klucz].push(produkt);
        }
      }
    }
  }

  return przetworzGrupy(mapaZlozona, 'tytul_sku');
}

function znajdzDuplikatyPoVendorze(produkty: ProduktInfo[]): GrupaZduplikowanychProduktow[] {
  const grupyTymczasowe: { [klucz: string]: ProduktInfo[] } = {};

  for (const produkt of produkty) {
    if (produkt.vendor) {
      const klucz = produkt.vendor.trim().toLowerCase();
      if (!grupyTymczasowe[klucz]) {
        grupyTymczasowe[klucz] = [];
      }
      grupyTymczasowe[klucz].push(produkt);
    }
  }

  return przetworzGrupy(grupyTymczasowe, 'vendor');
}

function przetworzGrupy(grupyTymczasowe: { [klucz: string]: ProduktInfo[] }, typKryterium: string): GrupaZduplikowanychProduktow[] {
  const wynikKoncowy: GrupaZduplikowanychProduktow[] = [];

  for (const klucz in grupyTymczasowe) {
    const grupa = grupyTymczasowe[klucz];
    if (grupa.length > 1) {
      // Sortujemy produkty w grupie od najstarszego do najnowszego
      const posortowanaGrupa = [...grupa].sort(
        (a, b) => new Date(a.dataUtworzenia).getTime() - new Date(b.dataUtworzenia).getTime()
      );

      const [oryginal, ...duplikaty] = posortowanaGrupa;

      wynikKoncowy.push({
        oryginal: oryginal,
        duplikatyDoUsuniecia: duplikaty,
        zduplikowanaWartosc: klucz
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
      vendor: krawedz.node.vendor,
      urlObrazka: krawedz.node.featuredImage?.url,
      dataUtworzenia: krawedz.node.createdAt,
      variants: krawedz.node.variants?.edges?.map((variantEdge: any) => ({
        id: variantEdge.node.id,
        sku: variantEdge.node.sku,
        barcode: variantEdge.node.barcode,
      })) || []
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
export function pogrupujProdukty(produkty: ProduktInfo[], kryterium: string): GrupaZduplikowanychProduktow[] {
  return znajdzWskazDuplikaty(produkty, kryterium);
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
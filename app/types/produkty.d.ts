// app/types/produkty.d.ts

export type WariantInfo = {
    id: string;
    sku?: string;
    barcode?: string;
};

export type ProduktInfo = {
    id: string;
    tytul: string;
    vendor?: string;
    urlObrazka?: string;
    dataUtworzenia: string;
    variants?: WariantInfo[];
};

// NOWA, ZAJAEBISTA STRUKTURA!
// Reprezentuje jeden "przypadek" duplikacji:
// Produkt-matka (ten, który zostaje) i jego gówniane duplikaty.
export type GrupaZduplikowanychProduktow = {
    oryginal: ProduktInfo; // Najstarszy produkt, uznawany za "matkę"
    duplikatyDoUsuniecia: ProduktInfo[]; // Reszta ścierwa
    zduplikowanaWartosc?: string; // Wartość, która została zduplikowana (SKU, tytuł, etc.)
};
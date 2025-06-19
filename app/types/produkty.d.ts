// app/types/produkty.d.ts

export type ProduktInfo = {
    id: string;
    tytul: string;
    urlObrazka?: string;
    dataUtworzenia: string;
};

// NOWA, ZAJAEBISTA STRUKTURA!
// Reprezentuje jeden "przypadek" duplikacji:
// Produkt-matka (ten, który zostaje) i jego gówniane duplikaty.
export type GrupaZduplikowanychProduktow = {
    oryginal: ProduktInfo; // Najstarszy produkt, uznawany za "matkę"
    duplikatyDoUsuniecia: ProduktInfo[]; // Reszta ścierwa
};
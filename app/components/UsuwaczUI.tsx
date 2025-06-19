import { useState, useCallback, useEffect } from 'react';
import type { GrupaZduplikowanychProduktow } from '../types/produkty';
import { Form } from '@remix-run/react';
import {
    Page, Card, BlockStack, Button, ResourceList, Thumbnail, Text, Checkbox,
    Box, InlineStack, Collapsible, Icon, InlineGrid
} from "@shopify/polaris";
import {
    DuplicateIcon, ChevronDownIcon, DeleteIcon,
    ProductFilledIcon, DuplicateIcon as DuplicateIconAlt, AlertDiamondIcon
} from '@shopify/polaris-icons';

interface UsuwaczUIProps {
    grupyDuplikatow: GrupaZduplikowanychProduktow[];
    czyApkaMieliDane: boolean;
    aktywnyTab: string;
    statystyki: {
        liczbaProduktow: number;
        liczbaGrupDuplikatow: number;
        liczbaKlonowDoUsuniecia: number;
    };
}

export function UsuwaczUI({ grupyDuplikatow, czyApkaMieliDane, aktywnyTab, statystyki }: UsuwaczUIProps) {
    const [otwarteId, setOtwarteId] = useState<Set<string>>(new Set());
    const [produktyDoUsuniecia, setProduktyDoUsuniecia] = useState<Set<string>>(new Set());

    // Reset zaznaczonych produktów po pomyślnym usunięciu
    useEffect(() => {
        if (czyApkaMieliDane) {
            setProduktyDoUsuniecia(new Set());
        }
    }, [czyApkaMieliDane]);

    const obslugaZmianyCheckboxa = useCallback((idProduktu: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        setProduktyDoUsuniecia(poprzedniStan => {
            const nowyStan = new Set(poprzedniStan);
            nowyStan.has(idProduktu) ? nowyStan.delete(idProduktu) : nowyStan.add(idProduktu);
            return nowyStan;
        });
    }, []);

    const przelaczWidocznosc = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setOtwarteId(poprzednieId => {
            const noweId = new Set(poprzednieId);
            if (noweId.has(id)) {
                noweId.delete(id);
            } else {
                noweId.add(id);
            }
            return noweId;
        });
    }, []);

    const zaznaczWszystkieWGrupie = (grupa: GrupaZduplikowanychProduktow) => {
        const idWszystkichDuplikatow = grupa.duplikatyDoUsuniecia.map(p => p.id);
        setProduktyDoUsuniecia(stan => new Set([...stan, ...idWszystkichDuplikatow]));
    };

    return (
        <Page title="Anihilator Duplikatów" subtitle="Chirurgiczna precyzja w eliminacji cyfrowego ścierwa.">
            <BlockStack gap="500">
                {/* --- PULPIT STATYSTYK (Poziom Strategiczny) --- */}
                <Card roundedAbove="sm">
                    <InlineGrid columns={{ xs: 1, sm: 3 }} gap="0">
                        {/* Statystyka 1 */}
                        <Box padding="400" borderInlineEndWidth="025" borderColor="border">
                            <BlockStack gap="200" inlineAlign="start">
                                <InlineStack gap="200" blockAlign="center">
                                    <Icon source={ProductFilledIcon} tone="subdued" />
                                    <Text as="h3" variant="headingSm" tone="subdued">
                                        Produkty w sklepie
                                    </Text>
                                </InlineStack>
                                <Text as="p" variant="headingXl" fontWeight="semibold">
                                    {statystyki.liczbaProduktow}
                                </Text>
                            </BlockStack>
                        </Box>

                        {/* Statystyka 2 */}
                        <Box padding="400" borderInlineEndWidth="025" borderColor="border">
                            <BlockStack gap="200" inlineAlign="start">
                                <InlineStack gap="200" blockAlign="center">
                                    <Icon source={DuplicateIconAlt} tone="subdued" />
                                    <Text as="h3" variant="headingSm" tone="subdued">
                                        Grupy duplikatów
                                    </Text>
                                </InlineStack>
                                <Text as="p" variant="headingXl" fontWeight="semibold">
                                    {statystyki.liczbaGrupDuplikatow}
                                </Text>
                            </BlockStack>
                        </Box>

                        {/* Statystyka 3 */}
                        <Box padding="400">
                            <BlockStack gap="200" inlineAlign="start">
                                <InlineStack gap="200" blockAlign="center">
                                    <Icon source={AlertDiamondIcon} tone="critical" />
                                    <Text as="h3" variant="headingSm" tone="critical">
                                        Klony do anihilacji
                                    </Text>
                                </InlineStack>
                                <Text as="p" variant="headingXl" fontWeight="semibold" tone="critical">
                                    {statystyki.liczbaKlonowDoUsuniecia}
                                </Text>
                            </BlockStack>
                        </Box>
                    </InlineGrid>
                </Card>

                {/* --- KOMUNIKAT O SKANOWANIU --- */}
                {czyApkaMieliDane && grupyDuplikatow.length === 0 && (
                    <Card><Box padding="400"><Text as="p" tone='subdued'>Skanuję arsenał wroga... Czekaj, kurwa...</Text></Box></Card>
                )}

                {/* --- KOMUNIKAT O BRAKU DUPLIKATÓW --- */}
                {!czyApkaMieliDane && grupyDuplikatow.length === 0 && (
                    <Card>
                        <Box padding="400">
                            <BlockStack gap="200" inlineAlign="center">
                                <Text as="h2" variant="headingLg">Jesteś Czysty!</Text>
                                <Text as="p" tone="success">Nie znaleziono żadnych duplikatów. Twój sklep jest w zajebistej kondycji. Możesz iść na piwo.</Text>
                            </BlockStack>
                        </Box>
                    </Card>
                )}

                {/* --- NOWA, ZAJAEBISTA LISTA ZWIJANA --- */}
                {grupyDuplikatow.length > 0 && (
                    <Card>
                        <Form method="post">
                            <input type="hidden" name="_action" value="usun" />
                            {Array.from(produktyDoUsuniecia).map(id => (
                                <input type="hidden" name="idDoUsuniecia[]" value={id} key={id} />
                            ))}

                            <BlockStack gap="0">
                                <Box padding="400">
                                    <InlineStack align="space-between" blockAlign="center">
                                        <Text as="h2" variant="headingLg">Wykryto Problematyczne Produkty</Text>
                                        <Button variant="primary" tone="critical" submit disabled={produktyDoUsuniecia.size === 0} loading={czyApkaMieliDane}>
                                            Anihiluj Zaznaczone ({produktyDoUsuniecia.size.toString()})
                                        </Button>
                                    </InlineStack>
                                </Box>

                                <ResourceList
                                    resourceName={{ singular: 'przypadek duplikacji', plural: 'przypadki duplikacji' }}
                                    items={grupyDuplikatow}
                                    renderItem={(grupa, id) => {
                                        const { oryginal, duplikatyDoUsuniecia } = grupa;
                                        const jestOtwarty = otwarteId.has(oryginal.id);

                                        return (
                                            <li style={{ borderTop: '1px solid var(--p-color-border)', listStyle: 'none' }}>
                                                <div style={{ padding: 'var(--p-space-400)', cursor: 'pointer' }} onClick={(e) => przelaczWidocznosc(oryginal.id, e)}>
                                                    <InlineStack blockAlign="center" align="space-between">
                                                        <InlineStack blockAlign="center" gap="400" wrap={false}>
                                                            <Thumbnail source={oryginal.urlObrazka || ''} alt="" />
                                                            <BlockStack>
                                                                <Text as="span" variant="bodyMd" fontWeight="bold">{oryginal.tytul}</Text>
                                                                <Text as="span" tone="subdued">Oryginał (Najstarszy)</Text>
                                                            </BlockStack>
                                                        </InlineStack>
                                                        <InlineStack blockAlign="center" gap="300">
                                                            <Icon source={DuplicateIcon} />
                                                            <Text as="span" tone="subdued">{duplikatyDoUsuniecia.length} duplikatów</Text>
                                                            <div style={{ transform: jestOtwarty ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                                                                <Icon source={ChevronDownIcon} />
                                                            </div>
                                                        </InlineStack>
                                                    </InlineStack>
                                                </div>
                                                <Collapsible open={jestOtwarty} id={oryginal.id}>
                                                    <Box padding="400" paddingBlockStart="0" background='bg-surface-secondary'>
                                                        <BlockStack gap="400">
                                                            <InlineStack align="space-between" blockAlign="center">
                                                                <Text as="span" variant="headingMd">Klony do usunięcia:</Text>
                                                                <Button size='slim' onClick={() => zaznaczWszystkieWGrupie(grupa)}>Zaznacz wszystkie</Button>
                                                            </InlineStack>

                                                            {duplikatyDoUsuniecia.map(duplikat => (
                                                                <div
                                                                    key={duplikat.id}
                                                                    onClick={(e: React.MouseEvent) => obslugaZmianyCheckboxa(duplikat.id, e)}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <InlineStack blockAlign="center" gap="400">
                                                                        <Checkbox
                                                                            label=""
                                                                            labelHidden
                                                                            checked={produktyDoUsuniecia.has(duplikat.id)}
                                                                            onChange={() => obslugaZmianyCheckboxa(duplikat.id)}
                                                                        />
                                                                        <Thumbnail source={duplikat.urlObrazka || ''} alt="" />
                                                                        <BlockStack>
                                                                            <Text as="span">{duplikat.tytul}</Text>
                                                                            <Text as="span" tone="subdued">Utworzono: {new Date(duplikat.dataUtworzenia).toLocaleDateString()}</Text>
                                                                        </BlockStack>
                                                                    </InlineStack>
                                                                </div>
                                                            ))}
                                                        </BlockStack>
                                                    </Box>
                                                </Collapsible>
                                            </li>
                                        )
                                    }}
                                />
                            </BlockStack>
                        </Form>
                    </Card>
                )}
            </BlockStack>
        </Page>
    );
}
import { useState, useCallback, useEffect } from 'react';
import type { GrupaZduplikowanychProduktow } from '../types/produkty';
import { Form, useNavigate, useSubmit } from '@remix-run/react';
import {
    Page, Card, BlockStack, Button, ResourceList, Thumbnail, Text, Checkbox,
    Box, InlineStack, Collapsible, Icon, InlineGrid, Tabs, Popover, ActionList
} from "@shopify/polaris";
import {
    DuplicateIcon, ChevronDownIcon, DeleteIcon,
    ProductFilledIcon, DuplicateIcon as DuplicateIconAlt, AlertDiamondIcon,
    MenuHorizontalIcon, BarcodeIcon, CheckIcon, DisabledIcon, SortAscendingIcon, SortDescendingIcon
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
    const navigate = useNavigate();
    const submit = useSubmit();
    const [produktyDoUsuniecia, setProduktyDoUsuniecia] = useState<Set<string>>(new Set());
    const [rozwinieteId, setRozwinieteId] = useState<Set<string>>(new Set());
    const [popoverAktywny, setPopoverAktywny] = useState(false);
    const [aktywnePopovery, setAktywnePopovery] = useState<Set<string>>(new Set());

    // Tabs definition
    const taby = [
        { id: 'tytul', content: 'Title', icon: <Icon source={ProductFilledIcon} /> },
        { id: 'sku', content: 'SKU', icon: <Icon source={BarcodeIcon} /> },
        { id: 'tytul_sku', content: 'Title + SKU', icon: <Icon source={DuplicateIconAlt} /> },
        { id: 'vendor', content: 'Vendor', icon: <Icon source={AlertDiamondIcon} /> },
        { id: 'barcode', content: 'Barcode', icon: <Icon source={BarcodeIcon} /> },
        { id: 'tytul_barcode', content: 'Title + Barcode', icon: <Icon source={DuplicateIconAlt} /> },
        { id: 'sku_barcode', content: 'SKU + Barcode', icon: <Icon source={DuplicateIconAlt} /> }
    ];

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
        setRozwinieteId(poprzednieId => {
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

    // Szybkie akcje
    const rozwinWszystko = () => {
        const wszystkieId = grupyDuplikatow.map(grupa => grupa.oryginal.id);
        setRozwinieteId(new Set(wszystkieId));
    };

    const zwinWszystko = () => {
        setRozwinieteId(new Set());
    };

    const zaznaczWszystko = () => {
        const wszystkieDuplikaty = grupyDuplikatow.flatMap(grupa => grupa.duplikatyDoUsuniecia.map(p => p.id));
        setProduktyDoUsuniecia(new Set(wszystkieDuplikaty));
    };

    const odznaczWszystko = () => {
        setProduktyDoUsuniecia(new Set());
    };

    const akcje = [
        {
            content: 'Expand all',
            onAction: rozwinWszystko,
        },
        {
            content: 'Collapse all',
            onAction: zwinWszystko,
        },
        {
            content: 'Select all',
            onAction: zaznaczWszystko,
        },
        {
            content: 'Deselect all',
            onAction: odznaczWszystko,
        },
    ];

    const usunOryginal = useCallback((grupa: GrupaZduplikowanychProduktow) => {
        const formData = new FormData();
        formData.append('_action', 'usun_oryginal');
        formData.append('idGrupy', grupa.oryginal.id);
        submit(formData, { method: 'post' });
    }, [submit]);

    return (
        <Page title="DC Remove Duplicates" subtitle="Remove duplicate products with precision.">
            <BlockStack gap="500">
                {/* --- STATS DASHBOARD --- */}
                <Card roundedAbove="sm">
                    <InlineGrid columns={{ xs: 1, sm: 3 }} gap="0">
                        {/* Stat 1 */}
                        <Box padding="400" borderInlineEndWidth="025" borderColor="border">
                            <BlockStack gap="200" inlineAlign="start">
                                <InlineStack gap="200" blockAlign="center">
                                    <Icon source={ProductFilledIcon} tone="subdued" />
                                    <Text as="h3" variant="headingSm" tone="subdued">
                                        Products in store
                                    </Text>
                                </InlineStack>
                                <Text as="p" variant="headingXl" fontWeight="semibold">
                                    {statystyki.liczbaProduktow}
                                </Text>
                            </BlockStack>
                        </Box>

                        {/* Stat 2 */}
                        <Box padding="400" borderInlineEndWidth="025" borderColor="border">
                            <BlockStack gap="200" inlineAlign="start">
                                <InlineStack gap="200" blockAlign="center">
                                    <Icon source={DuplicateIconAlt} tone="subdued" />
                                    <Text as="h3" variant="headingSm" tone="subdued">
                                        Duplicate groups
                                    </Text>
                                </InlineStack>
                                <Text as="p" variant="headingXl" fontWeight="semibold">
                                    {statystyki.liczbaGrupDuplikatow}
                                </Text>
                            </BlockStack>
                        </Box>

                        {/* Stat 3 */}
                        <Box padding="400">
                            <BlockStack gap="200" inlineAlign="start">
                                <InlineStack gap="200" blockAlign="center">
                                    <Icon source={AlertDiamondIcon} tone="critical" />
                                    <Text as="h3" variant="headingSm" tone="critical">
                                        Clones to remove
                                    </Text>
                                </InlineStack>
                                <Text as="p" variant="headingXl" fontWeight="semibold" tone="critical">
                                    {statystyki.liczbaKlonowDoUsuniecia}
                                </Text>
                            </BlockStack>
                        </Box>
                    </InlineGrid>
                </Card>

                {/* --- SCANNING MESSAGE --- */}
                {czyApkaMieliDane && grupyDuplikatow.length === 0 && (
                    <Card>
                        <Box padding="400">
                            <BlockStack gap="400">
                                {/* Search options menu */}
                                <Box padding="0">
                                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                        <InlineStack gap="200" wrap={false} align="center">
                                            <Button
                                                pressed={aktywnyTab === 'tytul'}
                                                icon={ProductFilledIcon}
                                                onClick={() => navigate('/app?tab=tytul')}
                                                variant="tertiary"
                                            >
                                                Title
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'sku'}
                                                icon={BarcodeIcon}
                                                onClick={() => navigate('/app?tab=sku')}
                                                variant="tertiary"
                                            >
                                                SKU
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'tytul_sku'}
                                                icon={DuplicateIconAlt}
                                                onClick={() => navigate('/app?tab=tytul_sku')}
                                                variant="tertiary"
                                            >
                                                Title + SKU
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'vendor'}
                                                icon={AlertDiamondIcon}
                                                onClick={() => navigate('/app?tab=vendor')}
                                                variant="tertiary"
                                            >
                                                Vendor
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'barcode'}
                                                icon={BarcodeIcon}
                                                onClick={() => navigate('/app?tab=barcode')}
                                                variant="tertiary"
                                            >
                                                Barcode
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'tytul_barcode'}
                                                icon={DuplicateIconAlt}
                                                onClick={() => navigate('/app?tab=tytul_barcode')}
                                                variant="tertiary"
                                            >
                                                Title + Barcode
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'sku_barcode'}
                                                icon={DuplicateIconAlt}
                                                onClick={() => navigate('/app?tab=sku_barcode')}
                                                variant="tertiary"
                                            >
                                                SKU + Barcode
                                            </Button>
                                        </InlineStack>
                                    </div>
                                </Box>

                                {/* Scanning message */}
                                <BlockStack gap="200" inlineAlign="center">
                                    <Text as="h2" variant="headingLg">Scanning in progress...</Text>
                                    <Text as="p" tone="subdued">
                                        Scanning for duplicates by criteria: {
                                            aktywnyTab === 'tytul' ? 'Title' :
                                                aktywnyTab === 'sku' ? 'SKU' :
                                                    aktywnyTab === 'tytul_sku' ? 'Title + SKU' :
                                                        aktywnyTab === 'vendor' ? 'Vendor' :
                                                            aktywnyTab === 'barcode' ? 'Barcode' :
                                                                aktywnyTab === 'tytul_barcode' ? 'Title + Barcode' :
                                                                    aktywnyTab === 'sku_barcode' ? 'SKU + Barcode' :
                                                                        'Unknown'
                                        }. Please wait...
                                    </Text>
                                </BlockStack>
                            </BlockStack>
                        </Box>
                    </Card>
                )}

                {/* --- NO DUPLICATES MESSAGE --- */}
                {!czyApkaMieliDane && grupyDuplikatow.length === 0 && (
                    <Card>
                        <Box padding="400">
                            <BlockStack gap="400">
                                {/* Search options menu */}
                                <Box padding="0">
                                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                        <InlineStack gap="200" wrap={false} align="center">
                                            <Button
                                                pressed={aktywnyTab === 'tytul'}
                                                icon={ProductFilledIcon}
                                                onClick={() => navigate('/app?tab=tytul')}
                                                variant="tertiary"
                                            >
                                                Title
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'sku'}
                                                icon={BarcodeIcon}
                                                onClick={() => navigate('/app?tab=sku')}
                                                variant="tertiary"
                                            >
                                                SKU
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'tytul_sku'}
                                                icon={DuplicateIconAlt}
                                                onClick={() => navigate('/app?tab=tytul_sku')}
                                                variant="tertiary"
                                            >
                                                Title + SKU
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'vendor'}
                                                icon={AlertDiamondIcon}
                                                onClick={() => navigate('/app?tab=vendor')}
                                                variant="tertiary"
                                            >
                                                Vendor
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'barcode'}
                                                icon={BarcodeIcon}
                                                onClick={() => navigate('/app?tab=barcode')}
                                                variant="tertiary"
                                            >
                                                Barcode
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'tytul_barcode'}
                                                icon={DuplicateIconAlt}
                                                onClick={() => navigate('/app?tab=tytul_barcode')}
                                                variant="tertiary"
                                            >
                                                Title + Barcode
                                            </Button>
                                            <Button
                                                pressed={aktywnyTab === 'sku_barcode'}
                                                icon={DuplicateIconAlt}
                                                onClick={() => navigate('/app?tab=sku_barcode')}
                                                variant="tertiary"
                                            >
                                                SKU + Barcode
                                            </Button>
                                        </InlineStack>
                                    </div>
                                </Box>

                                {/* No duplicates message */}
                                <BlockStack gap="200" inlineAlign="center">
                                    <Text as="h2" variant="headingLg">No duplicates found in this category</Text>
                                    <Text as="p" tone="success">
                                        No duplicates found for criteria: {
                                            aktywnyTab === 'tytul' ? 'Title' :
                                                aktywnyTab === 'sku' ? 'SKU' :
                                                    aktywnyTab === 'tytul_sku' ? 'Title + SKU' :
                                                        aktywnyTab === 'vendor' ? 'Vendor' :
                                                            aktywnyTab === 'barcode' ? 'Barcode' :
                                                                aktywnyTab === 'tytul_barcode' ? 'Title + Barcode' :
                                                                    aktywnyTab === 'sku_barcode' ? 'SKU + Barcode' :
                                                                        'Unknown'
                                        }
                                    </Text>
                                </BlockStack>
                            </BlockStack>
                        </Box>
                    </Card>
                )}

                {/* --- DUPLICATE LIST --- */}
                {grupyDuplikatow.length > 0 && (
                    <Card>
                        <Form method="post">
                            <input type="hidden" name="_action" value="usun" />
                            {Array.from(produktyDoUsuniecia).map(id => (
                                <input type="hidden" name="idDoUsuniecia[]" value={id} key={id} />
                            ))}

                            <BlockStack gap="400">
                                {/* Header with tabs and actions */}
                                <Box padding="400">
                                    <BlockStack gap="400">
                                        <InlineStack align="space-between" blockAlign="center">
                                            <Text as="h2" variant="headingLg">Duplicate products detected</Text>
                                            <InlineStack gap="300">
                                                <Popover
                                                    active={popoverAktywny}
                                                    activator={
                                                        <Button
                                                            icon={MenuHorizontalIcon}
                                                            onClick={() => setPopoverAktywny(!popoverAktywny)}
                                                            variant="tertiary"
                                                        >
                                                            Quick actions
                                                        </Button>
                                                    }
                                                    onClose={() => setPopoverAktywny(false)}
                                                    preferredPosition="below"
                                                >
                                                    <ActionList
                                                        actionRole="menuitem"
                                                        items={akcje}
                                                    />
                                                </Popover>
                                                <Button
                                                    variant="primary"
                                                    tone="critical"
                                                    submit
                                                    disabled={produktyDoUsuniecia.size === 0 || czyApkaMieliDane}
                                                >
                                                    Remove selected ({produktyDoUsuniecia.size.toString()})
                                                </Button>
                                            </InlineStack>
                                        </InlineStack>

                                        {/* Tabs */}
                                        <Box padding="0">
                                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                                <InlineStack gap="200" wrap={false} align="center">
                                                    <Button
                                                        pressed={aktywnyTab === 'tytul'}
                                                        icon={ProductFilledIcon}
                                                        onClick={() => navigate('/app?tab=tytul')}
                                                        variant="tertiary"
                                                    >
                                                        Title
                                                    </Button>
                                                    <Button
                                                        pressed={aktywnyTab === 'sku'}
                                                        icon={BarcodeIcon}
                                                        onClick={() => navigate('/app?tab=sku')}
                                                        variant="tertiary"
                                                    >
                                                        SKU
                                                    </Button>
                                                    <Button
                                                        pressed={aktywnyTab === 'tytul_sku'}
                                                        icon={DuplicateIconAlt}
                                                        onClick={() => navigate('/app?tab=tytul_sku')}
                                                        variant="tertiary"
                                                    >
                                                        Title + SKU
                                                    </Button>
                                                    <Button
                                                        pressed={aktywnyTab === 'vendor'}
                                                        icon={AlertDiamondIcon}
                                                        onClick={() => navigate('/app?tab=vendor')}
                                                        variant="tertiary"
                                                    >
                                                        Vendor
                                                    </Button>
                                                    <Button
                                                        pressed={aktywnyTab === 'barcode'}
                                                        icon={BarcodeIcon}
                                                        onClick={() => navigate('/app?tab=barcode')}
                                                        variant="tertiary"
                                                    >
                                                        Barcode
                                                    </Button>
                                                    <Button
                                                        pressed={aktywnyTab === 'tytul_barcode'}
                                                        icon={DuplicateIconAlt}
                                                        onClick={() => navigate('/app?tab=tytul_barcode')}
                                                        variant="tertiary"
                                                    >
                                                        Title + Barcode
                                                    </Button>
                                                    <Button
                                                        pressed={aktywnyTab === 'sku_barcode'}
                                                        icon={DuplicateIconAlt}
                                                        onClick={() => navigate('/app?tab=sku_barcode')}
                                                        variant="tertiary"
                                                    >
                                                        SKU + Barcode
                                                    </Button>
                                                </InlineStack>
                                            </div>
                                        </Box>
                                    </BlockStack>
                                </Box>

                                <ResourceList
                                    resourceName={{ singular: 'duplicate case', plural: 'duplicate cases' }}
                                    items={grupyDuplikatow}
                                    renderItem={(grupa, id) => {
                                        const { oryginal, duplikatyDoUsuniecia } = grupa;
                                        const jestOtwarty = rozwinieteId.has(oryginal.id);

                                        return (
                                            <li style={{ borderTop: '1px solid var(--p-color-border)', listStyle: 'none' }}>
                                                <div style={{ padding: 'var(--p-space-400)', cursor: 'pointer' }} onClick={(e) => przelaczWidocznosc(oryginal.id, e)}>
                                                    <InlineStack blockAlign="center" align="space-between">
                                                        <InlineStack blockAlign="center" gap="400" wrap={false}>
                                                            <Thumbnail source={oryginal.urlObrazka || ''} alt="" />
                                                            <BlockStack>
                                                                <Text as="span" variant="bodyMd" fontWeight="bold">{oryginal.tytul}</Text>
                                                                <Text as="span" tone="subdued">Original (oldest)</Text>
                                                                {grupa.zduplikowanaWartosc && (
                                                                    <Text as="span" tone="subdued">
                                                                        Shared {aktywnyTab === 'sku' ? 'SKU' : aktywnyTab === 'vendor' ? 'Vendor' : 'Value'}: "{grupa.zduplikowanaWartosc}"
                                                                    </Text>
                                                                )}
                                                            </BlockStack>
                                                        </InlineStack>
                                                        <InlineStack blockAlign="center" gap="300">
                                                            <Button
                                                                icon={DeleteIcon}
                                                                tone="critical"
                                                                variant="tertiary"
                                                                disabled={czyApkaMieliDane}
                                                                onClick={() => usunOryginal(grupa)}
                                                            >
                                                                Remove original
                                                            </Button>
                                                            <Icon source={DuplicateIcon} />
                                                            <Text as="span" tone="subdued">{duplikatyDoUsuniecia.length} duplicates</Text>
                                                            <div style={{ transform: jestOtwarty ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                                                                <Icon source={ChevronDownIcon} />
                                                            </div>
                                                        </InlineStack>
                                                    </InlineStack>
                                                </div>
                                                <Collapsible open={jestOtwarty} id={oryginal.id}>
                                                    <Box padding="400" background='bg-surface-secondary'>
                                                        <BlockStack gap="400">
                                                            <InlineStack align="space-between">
                                                                <InlineStack gap="200" blockAlign="center">
                                                                    <Icon source={DuplicateIcon} />
                                                                    <Text as="span" variant="headingMd">Clones to remove:</Text>
                                                                </InlineStack>
                                                                <Popover
                                                                    active={aktywnePopovery.has(grupa.oryginal.id)}
                                                                    activator={
                                                                        <Button
                                                                            icon={MenuHorizontalIcon}
                                                                            onClick={() => {
                                                                                setAktywnePopovery(prev => {
                                                                                    const nowy = new Set(prev);
                                                                                    if (nowy.has(grupa.oryginal.id)) {
                                                                                        nowy.delete(grupa.oryginal.id);
                                                                                    } else {
                                                                                        nowy.add(grupa.oryginal.id);
                                                                                    }
                                                                                    return nowy;
                                                                                });
                                                                            }}
                                                                            variant="tertiary"
                                                                        >
                                                                            Selection options
                                                                        </Button>
                                                                    }
                                                                    onClose={() => setAktywnePopovery(prev => {
                                                                        const nowy = new Set(prev);
                                                                        nowy.delete(grupa.oryginal.id);
                                                                        return nowy;
                                                                    })}
                                                                    preferredPosition="below"
                                                                >
                                                                    <ActionList
                                                                        actionRole="menuitem"
                                                                        items={[
                                                                            {
                                                                                content: 'Select all in this group',
                                                                                icon: CheckIcon,
                                                                                onAction: () => zaznaczWszystkieWGrupie(grupa)
                                                                            },
                                                                            {
                                                                                content: 'Deselect all in this group',
                                                                                icon: DisabledIcon,
                                                                                onAction: () => {
                                                                                    const idWszystkichDuplikatow = grupa.duplikatyDoUsuniecia.map(p => p.id);
                                                                                    setProduktyDoUsuniecia(stan => {
                                                                                        const nowyStan = new Set(stan);
                                                                                        idWszystkichDuplikatow.forEach(id => nowyStan.delete(id));
                                                                                        return nowyStan;
                                                                                    });
                                                                                }
                                                                            },
                                                                            {
                                                                                content: 'Select newest',
                                                                                icon: SortDescendingIcon,
                                                                                onAction: () => {
                                                                                    const najnowszy = [...grupa.duplikatyDoUsuniecia].sort(
                                                                                        (a, b) => new Date(b.dataUtworzenia).getTime() - new Date(a.dataUtworzenia).getTime()
                                                                                    )[0];
                                                                                    if (najnowszy) {
                                                                                        setProduktyDoUsuniecia(stan => new Set([...stan, najnowszy.id]));
                                                                                    }
                                                                                }
                                                                            },
                                                                            {
                                                                                content: 'Select oldest',
                                                                                icon: SortAscendingIcon,
                                                                                onAction: () => {
                                                                                    const najstarszy = [...grupa.duplikatyDoUsuniecia].sort(
                                                                                        (a, b) => new Date(a.dataUtworzenia).getTime() - new Date(b.dataUtworzenia).getTime()
                                                                                    )[0];
                                                                                    if (najstarszy) {
                                                                                        setProduktyDoUsuniecia(stan => new Set([...stan, najstarszy.id]));
                                                                                    }
                                                                                }
                                                                            }
                                                                        ]}
                                                                    />
                                                                </Popover>
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
                                                                            <Text as="span" tone="subdued">Created: {new Date(duplikat.dataUtworzenia).toLocaleDateString()}</Text>
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
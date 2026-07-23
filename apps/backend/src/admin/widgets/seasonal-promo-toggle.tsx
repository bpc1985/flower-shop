import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text, Switch, Badge } from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ponytail: toggle seasonal product promotions (e.g. Tet, Valentine, 8/3).
// Stores state in Medusa app_metadata. Add proper settings module later.

declare const __BACKEND_URL__: string;

interface Promo {
  id: string;
  label: string;
  emoji: string;
  active: boolean;
  description: string;
}

const PROMOS: Promo[] = [
  { id: "promo-tet", label: "Tet 2027", emoji: "🎋", active: false, description: "Ap Tet collection" },
  { id: "promo-valentine", label: "Valentine", emoji: "💝", active: false, description: "14/2 collection" },
  { id: "promo-womensday", label: "8/3", emoji: "🌸", active: false, description: "Women's Day special" },
  { id: "promo-mothersday", label: "Mother's Day", emoji: "💐", active: false, description: "Ngay cua Me" },
  { id: "promo-2020", label: "20/10", emoji: "🌹", active: false, description: "Vietnam Women's Day" },
  { id: "promo-christmas", label: "Christmas", emoji: "🎄", active: false, description: "Noel collection" },
];

const SeasonalPromoWidget = () => {
  const queryClient = useQueryClient();

  const { data: promos = PROMOS, isLoading } = useQuery({
    queryKey: ["admin-promos"],
    queryFn: async () => {
      try {
        const resp = await fetch(`${__BACKEND_URL__}/admin/store`, {
          credentials: "include",
        });
        if (!resp.ok) return PROMOS;
        const json = await resp.json();
        const saved = json.store?.metadata?.seasonal_promos;
        return saved ? (JSON.parse(saved) as Promo[]) : PROMOS;
      } catch {
        return PROMOS;
      }
    },
    staleTime: 300_000,
  });

  const { mutate: toggle } = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const updated = promos.map((p) => (p.id === id ? { ...p, active } : p));
      // ponytail: update store metadata with promo state. Replace with proper
      // settings endpoint when admin API supports it.
      await fetch(`${__BACKEND_URL__}/admin/store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ metadata: { seasonal_promos: JSON.stringify(updated) } }),
      });
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
    },
  });

  if (isLoading) return <Container><Text>Loading...</Text></Container>;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Khuyen mai theo mua</Heading>
        <Badge color="purple">Bloom Wedding</Badge>
      </div>
      <div className="divide-y">
        {promos.map((promo) => (
          <div key={promo.id} className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <Text size="large">{promo.emoji}</Text>
              <div>
                <Text size="small" className="font-medium">{promo.label}</Text>
                <Text size="xsmall" className="text-ui-fg-subtle">{promo.description}</Text>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {promo.active && (
                <Badge color="green" size="small">ON</Badge>
              )}
              <Switch
                checked={promo.active}
                onCheckedChange={(checked) => toggle({ id: promo.id, active: checked })}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-3">
        <Text size="xsmall" className="text-ui-fg-muted">
          Active promotions show on homepage and product pages.
        </Text>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.list.before",
  id: "bloom:seasonal-promo-widget",
});

export default SeasonalPromoWidget;

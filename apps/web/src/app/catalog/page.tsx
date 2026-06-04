import { ProductCard } from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/api";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    sort?: string;
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({
      category: params.category,
      search: params.search,
      sort: params.sort,
    }).catch(() => []),
  ]);

  return (
    <section className="site-shell content-panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1 className="page-title">подбор товаров для автомобиля</h1>
        </div>
        <p className="lead">
          Ищите по названию, артикулу или категории, сравнивайте цены и быстро
          переходите к оформлению нужных позиций.
        </p>
      </div>

      <form className="filters">
        <input
          type="search"
          name="search"
          defaultValue={params.search ?? ""}
          className="input"
          placeholder="Поиск по названию, артикулу или описанию"
        />
        <select
          name="category"
          className="select"
          defaultValue={params.category ?? ""}
        >
          <option value="">Все категории</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        <select name="sort" className="select" defaultValue={params.sort ?? "newest"}>
          <option value="newest">Сначала новые</option>
          <option value="price_asc">Цена по возрастанию</option>
          <option value="price_desc">Цена по убыванию</option>
        </select>
        <button type="submit" className="button-primary">
          Применить
        </button>
      </form>

      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {!products.length ? (
        <div className="empty-state">По выбранным параметрам ничего не найдено.</div>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
} from "antd";
import type {
  FormProps,
  TableColumnsType,
  TabsProps,
  UploadProps,
} from "antd";

import { useAuth } from "@/components/auth-provider";
import { mockDashboardPayload, mockOrders } from "@/lib/mock-data";
import type {
  AdminCategoryCreatePayload,
  AdminManufacturerCreatePayload,
  AdminProductCreatePayload,
  Category,
  DashboardPayload,
  Manufacturer,
  Order,
  Product,
  StockAlert,
  UploadedObjectRead,
} from "@/lib/types";
import { formatDate, formatPrice, orderStatusColor, orderStatusLabel } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const initialProductValues: AdminProductCreatePayload = {
  article: "",
  slug: "",
  name: "",
  short_description: "",
  description: "",
  price: "",
  stock: 0,
  is_featured: false,
  category_name: "",
  manufacturer_name: "",
  manufacturer_country: "",
  min_quantity: 3,
  image_key: "",
  image_url: "",
  material: "",
  compatibility: "",
  warranty_months: undefined,
};

async function requestJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function uploadAdminFile(file: File, token: string): Promise<UploadedObjectRead> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/admin/storage/upload?folder=products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || "Не удалось загрузить файл");
  }

  return (await response.json()) as UploadedObjectRead;
}

function normalizeProductPayload(values: AdminProductCreatePayload): AdminProductCreatePayload {
  return {
    ...values,
    price: String(values.price),
    stock: Number(values.stock ?? 0),
    min_quantity: Number(values.min_quantity ?? 0),
    old_price: values.old_price ? String(values.old_price) : null,
    warranty_months: values.warranty_months ? Number(values.warranty_months) : undefined,
    image_key: values.image_key || undefined,
    image_url: values.image_url || undefined,
    manufacturer_country: values.manufacturer_country || undefined,
    category_slug: values.category_slug || undefined,
    material: values.material || undefined,
    compatibility: values.compatibility || undefined,
  };
}

export default function AdminPage() {
  const { message } = App.useApp();
  const { token, user } = useAuth();
  const [form] = Form.useForm<AdminProductCreatePayload>();
  const [categoryForm] = Form.useForm<AdminCategoryCreatePayload>();
  const [manufacturerForm] = Form.useForm<AdminManufacturerCreatePayload>();
  const [dashboard, setDashboard] = useState<DashboardPayload>(mockDashboardPayload);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [manufacturerModalOpen, setManufacturerModalOpen] = useState(false);
  const [dictionarySubmitting, setDictionarySubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedObjectRead | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const hasAccess = Boolean(user && user.role !== "customer");
  const canUseRealAdmin = Boolean(hasAccess && token && !token.startsWith("demo-"));

  async function loadAdminData() {
    if (!canUseRealAdmin || !token) {
      setDashboard(mockDashboardPayload);
      setOrders(mockOrders);
      setProducts([]);
      setCategories([]);
      setManufacturers([]);
      return;
    }

    setLoading(true);
    try {
      const [dashboardData, ordersData, productsData, categoriesData, manufacturersData] =
        await Promise.all([
          requestJson<DashboardPayload>("/admin/dashboard", token),
          requestJson<Order[]>("/admin/orders", token),
          requestJson<Product[]>("/admin/products", token),
          requestJson<Category[]>("/admin/categories", token),
          requestJson<Manufacturer[]>("/admin/manufacturers", token),
        ]);

      setDashboard(dashboardData);
      setOrders(ordersData);
      setProducts(productsData);
      setCategories(categoriesData);
      setManufacturers(manufacturersData);
    } catch {
      setDashboard(mockDashboardPayload);
      setOrders(mockOrders);
      setProducts([]);
      setCategories([]);
      setManufacturers([]);
      message.error("Не удалось загрузить данные админ-панели.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminData();
  }, [canUseRealAdmin, token]);

  function resetProductEditor() {
    setEditingProductId(null);
    setUploadedImage(null);
    form.resetFields();
    form.setFieldsValue(initialProductValues);
  }

  async function openProductEditor(productId: number) {
    if (!token || !canUseRealAdmin) {
      message.warning("Для редактирования нужно войти под сотрудником магазина.");
      return;
    }

    try {
      const product = await requestJson<Product>(`/admin/products/${productId}`, token);
      setEditingProductId(product.id);
      setUploadedImage(
        product.image_url
          ? {
              key: product.image_key ?? "",
              url: product.image_url,
              content_type: "image/*",
              size: 0,
            }
          : null,
      );
      form.setFieldsValue({
        article: product.article,
        slug: product.slug,
        name: product.name,
        short_description: product.short_description,
        description: product.description,
        price: String(product.price),
        old_price: product.old_price ?? undefined,
        stock: product.stock,
        is_featured: product.is_featured,
        category_name: product.category.name,
        category_slug: product.category.slug,
        manufacturer_name: product.manufacturer.name,
        manufacturer_country: product.manufacturer.country ?? "",
        image_url: product.image_url,
        image_key: product.image_key ?? "",
        material: product.characteristic?.material ?? "",
        compatibility: product.characteristic?.compatibility ?? "",
        warranty_months: product.characteristic?.warranty_months ?? undefined,
        min_quantity: product.min_quantity ?? 3,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      message.success("Товар загружен в форму редактирования.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Не удалось загрузить товар.");
    }
  }

  const handleSaveProduct: FormProps<AdminProductCreatePayload>["onFinish"] = async (values) => {
    if (!token || !canUseRealAdmin) {
      message.warning("Для управления товарами нужно войти под сотрудником магазина.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedCategory = categories.find((item) => item.name === values.category_name);
      const selectedManufacturer = manufacturers.find(
        (item) => item.name === values.manufacturer_name,
      );

      const payload = normalizeProductPayload({
        ...values,
        category_slug: selectedCategory?.slug ?? values.category_slug,
        manufacturer_country:
          selectedManufacturer?.country ?? values.manufacturer_country ?? undefined,
      });

      const path = editingProductId ? `/admin/products/${editingProductId}` : "/admin/products";
      const method = editingProductId ? "PUT" : "POST";

      await requestJson<Product>(path, token, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      resetProductEditor();
      await loadAdminData();
      message.success(editingProductId ? "Товар обновлён." : "Товар создан.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Ошибка сохранения товара.");
    } finally {
      setSubmitting(false);
    }
  };

  function openCategoryCreateModal() {
    setEditingCategory(null);
    categoryForm.resetFields();
    setCategoryModalOpen(true);
  }

  function openCategoryEditModal(category: Category) {
    setEditingCategory(category);
    categoryForm.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description,
    });
    setCategoryModalOpen(true);
  }

  async function handleSaveCategory(values: AdminCategoryCreatePayload) {
    if (!token || !canUseRealAdmin) {
      message.warning("Для работы со справочником нужен реальный доступ.");
      return;
    }

    setDictionarySubmitting(true);
    try {
      const path = editingCategory
        ? `/admin/categories/${editingCategory.id}`
        : "/admin/categories";
      const method = editingCategory ? "PUT" : "POST";
      const saved = await requestJson<Category>(path, token, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      setCategories((current) =>
        updateCollection(current, saved, (item) => item.id === saved.id, (a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      if (!editingCategory) {
        form.setFieldsValue({ category_name: saved.name, category_slug: saved.slug });
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      categoryForm.resetFields();
      message.success(editingCategory ? "Категория обновлена." : "Категория добавлена.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Не удалось сохранить категорию.");
    } finally {
      setDictionarySubmitting(false);
    }
  }

  function openManufacturerCreateModal() {
    setEditingManufacturer(null);
    manufacturerForm.resetFields();
    setManufacturerModalOpen(true);
  }

  function openManufacturerEditModal(manufacturer: Manufacturer) {
    setEditingManufacturer(manufacturer);
    manufacturerForm.setFieldsValue({
      name: manufacturer.name,
      country: manufacturer.country,
    });
    setManufacturerModalOpen(true);
  }

  async function handleSaveManufacturer(values: AdminManufacturerCreatePayload) {
    if (!token || !canUseRealAdmin) {
      message.warning("Для работы со справочником нужен реальный доступ.");
      return;
    }

    setDictionarySubmitting(true);
    try {
      const path = editingManufacturer
        ? `/admin/manufacturers/${editingManufacturer.id}`
        : "/admin/manufacturers";
      const method = editingManufacturer ? "PUT" : "POST";
      const saved = await requestJson<Manufacturer>(path, token, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      setManufacturers((current) =>
        updateCollection(current, saved, (item) => item.id === saved.id, (a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      if (!editingManufacturer) {
        form.setFieldsValue({
          manufacturer_name: saved.name,
          manufacturer_country: saved.country ?? "",
        });
      }
      setManufacturerModalOpen(false);
      setEditingManufacturer(null);
      manufacturerForm.resetFields();
      message.success(
        editingManufacturer ? "Производитель обновлён." : "Производитель добавлен.",
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Не удалось сохранить производителя.",
      );
    } finally {
      setDictionarySubmitting(false);
    }
  }

  async function handleDeleteCategory(category: Category) {
    if (!token || !canUseRealAdmin) {
      return;
    }

    Modal.confirm({
      title: `Удалить категорию «${category.name}»?`,
      content: "Если к категории привязаны товары, удаление будет отклонено.",
      okText: "Удалить",
      cancelText: "Отмена",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await requestJson<void>(`/admin/categories/${category.id}`, token, {
            method: "DELETE",
          });
          setCategories((current) => current.filter((item) => item.id !== category.id));
          message.success("Категория удалена.");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "Не удалось удалить категорию.");
        }
      },
    });
  }

  async function handleDeleteManufacturer(manufacturer: Manufacturer) {
    if (!token || !canUseRealAdmin) {
      return;
    }

    Modal.confirm({
      title: `Удалить производителя «${manufacturer.name}»?`,
      content: "Если к производителю привязаны товары, удаление будет отклонено.",
      okText: "Удалить",
      cancelText: "Отмена",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await requestJson<void>(`/admin/manufacturers/${manufacturer.id}`, token, {
            method: "DELETE",
          });
          setManufacturers((current) => current.filter((item) => item.id !== manufacturer.id));
          message.success("Производитель удалён.");
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : "Не удалось удалить производителя.",
          );
        }
      },
    });
  }

  async function handleDeleteProduct(product: Product) {
    if (!token || !canUseRealAdmin) {
      return;
    }

    Modal.confirm({
      title: `Удалить товар «${product.name}»?`,
      content: "Если товар уже используется в заказах, удаление будет отклонено.",
      okText: "Удалить",
      cancelText: "Отмена",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await requestJson<void>(`/admin/products/${product.id}`, token, {
            method: "DELETE",
          });
          setProducts((current) => current.filter((item) => item.id !== product.id));
          if (editingProductId === product.id) {
            resetProductEditor();
          }
          message.success("Товар удалён.");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "Не удалось удалить товар.");
        }
      },
    });
  }

  async function handleClearProducts() {
    if (!token || !canUseRealAdmin) {
      message.warning("Для очистки каталога нужно войти под сотрудником магазина.");
      return;
    }

    Modal.confirm({
      title: "Очистить каталог?",
      content: "Будут удалены все товары, остатки и история цен.",
      okText: "Удалить",
      cancelText: "Отмена",
      okButtonProps: { danger: true },
      onOk: async () => {
        setClearing(true);
        try {
          await requestJson<void>("/admin/products", token, { method: "DELETE" });
          setProducts([]);
          resetProductEditor();
          await loadAdminData();
          message.success("Каталог очищен.");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "Ошибка очистки каталога.");
        } finally {
          setClearing(false);
        }
      },
    });
  }

  const handleUploadImage: UploadProps["customRequest"] = async ({ file, onSuccess, onError }) => {
    if (!token || !canUseRealAdmin) {
      message.warning("Для загрузки изображения нужно войти под сотрудником магазина.");
      onError?.(new Error("Нет доступа"));
      return;
    }

    if (!(file instanceof File)) {
      onError?.(new Error("Некорректный файл"));
      return;
    }

    setUploadingImage(true);
    try {
      const uploaded = await uploadAdminFile(file, token);
      setUploadedImage(uploaded);
      form.setFieldsValue({
        image_key: uploaded.key,
        image_url: "",
      });
      message.success("Изображение загружено.");
      onSuccess?.(uploaded);
    } catch (error) {
      const uploadError =
        error instanceof Error ? error : new Error("Не удалось загрузить изображение");
      message.error(uploadError.message);
      onError?.(uploadError);
    } finally {
      setUploadingImage(false);
    }
  };

  const visibleDashboard = canUseRealAdmin ? dashboard : mockDashboardPayload;
  const visibleOrders = canUseRealAdmin ? orders : mockOrders;

  async function handleConfirmOrder(order: Order) {
    if (!token || !canUseRealAdmin) {
      message.warning("Для подтверждения заказа нужно войти под сотрудником магазина.");
      return;
    }

    try {
      const updated = await requestJson<Order>(`/admin/orders/${order.id}/confirm`, token, {
        method: "POST",
      });
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      message.success("Заказ подтверждён. Ссылка на оплату отправлена пользователю.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Не удалось подтвердить заказ.");
    }
  }

  async function handleShipOrder(order: Order) {
    if (!token || !canUseRealAdmin) {
      message.warning("Для отправки заказа нужно войти под сотрудником магазина.");
      return;
    }

    try {
      const updated = await requestJson<Order>(`/admin/orders/${order.id}/ship`, token, {
        method: "POST",
      });
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      message.success("Заказ переведён в статус отправленного.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Не удалось отправить заказ.");
    }
  }

  const categoryOptions = categories.map((item) => ({
    value: item.name,
    label: item.name,
  }));
  const manufacturerOptions = manufacturers.map((item) => ({
    value: item.name,
    label: item.name,
  }));

  const productColumns = useMemo<TableColumnsType<Product>>(
    () => [
      {
        title: "Товар",
        key: "product",
        render: (_, product) => (
          <div>
            <strong>{product.name}</strong>
            <div className="muted-text">{product.short_description}</div>
          </div>
        ),
      },
      {
        title: "Артикул",
        dataIndex: "article",
        key: "article",
        render: (value: string) => <Tag>{value}</Tag>,
      },
      {
        title: "Категория",
        key: "category",
        render: (_, product) => product.category.name,
      },
      {
        title: "Производитель",
        key: "manufacturer",
        render: (_, product) => product.manufacturer.name,
      },
      {
        title: "Цена",
        key: "price",
        render: (_, product) => formatPrice(product.price),
      },
      {
        title: "Остаток",
        dataIndex: "stock",
        key: "stock",
      },
      {
        title: "Действия",
        key: "actions",
        render: (_, product) => (
          <Space wrap>
            <Button className="button-secondary" onClick={() => void openProductEditor(product.id)}>
              Изменить
            </Button>
            <Button danger onClick={() => void handleDeleteProduct(product)}>
              Удалить
            </Button>
          </Space>
        ),
      },
    ],
    [editingProductId, products],
  );

  const orderColumns = useMemo<TableColumnsType<Order>>(
    () => [
      {
        title: "Заказ",
        key: "number",
        render: (_, order) => (
          <div>
            <strong>{order.number}</strong>
            <div className="muted-text">{formatDate(order.created_at)}</div>
          </div>
        ),
      },
      {
        title: "Клиент",
        key: "customer",
        render: (_, order) => (
          <div>
            <strong>{order.customer_name}</strong>
            <div className="muted-text">{order.customer_phone}</div>
          </div>
        ),
      },
      {
        title: "Статус",
        dataIndex: "status",
        key: "status",
        render: (value: Order["status"]) => (
          <Tag color={orderStatusColor(value)}>{orderStatusLabel(value)}</Tag>
        ),
      },
      {
        title: "Товаров",
        key: "items",
        render: (_, order) => order.items.length,
      },
      {
        title: "Сумма",
        key: "total_amount",
        render: (_, order) => formatPrice(order.total_amount),
      },
      {
        title: "Действия",
        key: "actions",
        render: (_, order) => (
          <Space wrap>
            <Button
              className="button-secondary"
              disabled={!["new", "processing"].includes(order.status)}
              onClick={() => void handleConfirmOrder(order)}
            >
              Подтвердить
            </Button>
            <Button
              type="primary"
              className="button-primary"
              disabled={order.status !== "paid"}
              onClick={() => void handleShipOrder(order)}
            >
              Отправить
            </Button>
          </Space>
        ),
      },
    ],
    [canUseRealAdmin, token],
  );

  const dashboardCards = (
    <div className="dashboard-grid">
      {visibleDashboard.metrics.map((metric) => (
        <Card key={metric.label} className="admin-card">
          <Statistic title={metric.label} value={metric.value} />
          <p className="metric-note">{metric.note}</p>
        </Card>
      ))}
    </div>
  );

  const lowStockList = (visibleDashboard.low_stock.length
    ? visibleDashboard.low_stock
    : []) as StockAlert[];

  const adminTabs: TabsProps["items"] = [
    {
      key: "overview",
      label: "Обзор",
      children: (
        <div className="admin-stack">
          {dashboardCards}

          <div className="cards-two">
            <Card className="summary-card admin-card" title="Последние заказы">
              <List
                dataSource={visibleOrders.slice(0, 6)}
                locale={{ emptyText: <Empty description="Заказов пока нет" /> }}
                renderItem={(order) => (
                  <List.Item>
                    <List.Item.Meta
                      title={order.number}
                      description={`${order.customer_name} · ${formatDate(order.created_at)}`}
                    />
                    <strong>{formatPrice(order.total_amount)}</strong>
                  </List.Item>
                )}
              />
            </Card>

            <Card className="summary-card admin-card" title="Контроль остатков">
              <List
                dataSource={lowStockList}
                locale={{ emptyText: <Empty description="Критичных остатков нет" /> }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.product_name}
                      description={`Артикул ${item.article}`}
                    />
                    <Tag color={item.stock <= item.min_quantity ? "red" : "default"}>
                      {item.stock} шт.
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </div>

          <Card className="admin-card" title="Основные рабочие шаги">
            <ol className="guide-list">
              <li>Проверяйте новые заказы и подтверждайте позиции, готовые к оплате.</li>
              <li>Поддерживайте в актуальном состоянии категории, бренды и карточки товаров.</li>
              <li>Добавляйте изображения и характеристики прямо при редактировании позиции.</li>
              <li>После оплаты переводите заказ в отправку и отслеживайте сроки.</li>
            </ol>
          </Card>
        </div>
      ),
    },
    {
      key: "products",
      label: "Товары",
      children: (
        <div className="admin-stack">
          <div className="cards-two admin-form-grid">
            <Card
              className="form-card admin-card"
              title={editingProductId ? "Редактировать товар" : "Добавить товар"}
              extra={
                editingProductId ? (
                  <Button className="button-secondary" onClick={resetProductEditor}>
                    Отменить редактирование
                  </Button>
                ) : null
              }
            >
              <Form<AdminProductCreatePayload>
                form={form}
                layout="vertical"
                initialValues={initialProductValues}
                onFinish={handleSaveProduct}
                className="admin-product-form"
              >
                <Form.Item label="Артикул" name="article" rules={[{ required: true }]}>
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Название" name="name" rules={[{ required: true }]}>
                  <Input size="large" />
                </Form.Item>
                <Form.Item
                  label="Краткое описание"
                  name="short_description"
                  rules={[{ required: true }]}
                >
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Полное описание" name="description" rules={[{ required: true }]}>
                  <Input.TextArea rows={5} />
                </Form.Item>

                <Form.Item label="Категория" name="category_name" rules={[{ required: true }]}>
                  <Select
                    size="large"
                    showSearch
                    options={categoryOptions}
                    placeholder="Выберите категорию"
                    optionFilterProp="label"
                    onChange={(value) => {
                      const selected = categories.find((item) => item.name === value);
                      form.setFieldsValue({ category_slug: selected?.slug });
                    }}
                  />
                </Form.Item>
                <div className="button-row admin-inline-actions">
                  <Button className="button-secondary" onClick={openCategoryCreateModal}>
                    Добавить категорию
                  </Button>
                </div>

                <Form.Item
                  label="Производитель"
                  name="manufacturer_name"
                  rules={[{ required: true }]}
                >
                  <Select
                    size="large"
                    showSearch
                    options={manufacturerOptions}
                    placeholder="Выберите производителя"
                    optionFilterProp="label"
                    onChange={(value) => {
                      const selected = manufacturers.find((item) => item.name === value);
                      form.setFieldsValue({
                        manufacturer_country: selected?.country ?? "",
                      });
                    }}
                  />
                </Form.Item>
                <div className="button-row admin-inline-actions">
                  <Button className="button-secondary" onClick={openManufacturerCreateModal}>
                    Добавить производителя
                  </Button>
                </div>

                <Form.Item label="Страна производителя" name="manufacturer_country">
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Цена" name="price" rules={[{ required: true }]}>
                  <Input size="large" type="number" min="0" step="0.01" />
                </Form.Item>
                <Form.Item label="Старая цена" name="old_price">
                  <Input size="large" type="number" min="0" step="0.01" />
                </Form.Item>
                <Form.Item label="Остаток" name="stock">
                  <InputNumber size="large" min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="Минимальный остаток" name="min_quantity">
                  <InputNumber size="large" min={0} style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item label="Изображение товара">
                  <div className="admin-upload-block">
                    <Upload
                      accept="image/*"
                      maxCount={1}
                      showUploadList={false}
                      customRequest={handleUploadImage}
                    >
                      <Button className="button-secondary" loading={uploadingImage}>
                        Выбрать файл
                      </Button>
                    </Upload>
                    <p className="input-hint">Выберите изображение товара с компьютера.</p>
                    {uploadedImage ? (
                      <div className="admin-image-preview">
                        <img src={uploadedImage.url} alt="Загруженное изображение" />
                        <div>
                          <strong>{uploadedImage.key || "Текущее изображение товара"}</strong>
                          <div className="muted-text">
                            {uploadedImage.key || "Изображение уже сохранено у товара"}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Form.Item>
                <Form.Item name="image_key" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="image_url" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="category_slug" hidden>
                  <Input />
                </Form.Item>

                <Form.Item label="Материал" name="material">
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Совместимость" name="compatibility">
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Гарантия, мес." name="warranty_months">
                  <InputNumber size="large" min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  label="Показывать в хитах"
                  name="is_featured"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="button-primary"
                  loading={submitting}
                >
                  {editingProductId ? "Сохранить изменения" : "Создать товар"}
                </Button>
              </Form>
            </Card>

            <Card
              className="summary-card admin-card"
              title="Состояние каталога"
              extra={
                <Button danger onClick={handleClearProducts} loading={clearing}>
                  Очистить каталог
                </Button>
              }
            >
              <p className="lead">
                Здесь удобно просматривать свежие позиции, быстро открывать
                редактирование и контролировать наполнение каталога.
              </p>
              <List
                dataSource={products.slice(0, 6)}
                locale={{ emptyText: <Empty description="Товаров пока нет" /> }}
                renderItem={(product) => (
                  <List.Item
                    actions={[
                      <Button
                        key="edit"
                        className="button-secondary"
                        onClick={() => void openProductEditor(product.id)}
                      >
                        Изменить
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={product.name}
                      description={`${product.article} · ${product.category.name} · ${product.manufacturer.name}`}
                    />
                    <strong>{formatPrice(product.price)}</strong>
                  </List.Item>
                )}
              />
            </Card>
          </div>

          <Card className="admin-card admin-table-card" title="Все товары">
            <Table<Product>
              rowKey="id"
              loading={loading}
              columns={productColumns}
              dataSource={products}
              pagination={{ pageSize: 6 }}
              locale={{ emptyText: <Empty description="Каталог пуст" /> }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: "dictionaries",
      label: "Справочники",
      children: (
        <div className="cards-two">
          <Card
            className="admin-card"
            title="Категории"
            extra={
              <Button className="button-secondary" onClick={openCategoryCreateModal}>
                Добавить
              </Button>
            }
          >
            <List
              dataSource={categories}
              loading={loading}
              locale={{ emptyText: <Empty description="Категорий пока нет" /> }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="edit"
                      className="button-secondary"
                      onClick={() => openCategoryEditModal(item)}
                    >
                      Изменить
                    </Button>,
                    <Button key="delete" danger onClick={() => void handleDeleteCategory(item)}>
                      Удалить
                    </Button>,
                  ]}
                >
                  <List.Item.Meta title={item.name} description={item.description || item.slug} />
                  <Tag>{item.slug}</Tag>
                </List.Item>
              )}
            />
          </Card>
          <Card
            className="admin-card"
            title="Производители"
            extra={
              <Button className="button-secondary" onClick={openManufacturerCreateModal}>
                Добавить
              </Button>
            }
          >
            <List
              dataSource={manufacturers}
              loading={loading}
              locale={{ emptyText: <Empty description="Производителей пока нет" /> }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="edit"
                      className="button-secondary"
                      onClick={() => openManufacturerEditModal(item)}
                    >
                      Изменить
                    </Button>,
                    <Button
                      key="delete"
                      danger
                      onClick={() => void handleDeleteManufacturer(item)}
                    >
                      Удалить
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.name}
                    description={item.country || "Страна не указана"}
                  />
                </List.Item>
              )}
            />
          </Card>
        </div>
      ),
    },
    {
      key: "orders",
      label: "Заказы",
      children: (
        <Card className="admin-card admin-table-card" title="Список заказов">
          <Table<Order>
            rowKey="id"
            loading={loading}
            columns={orderColumns}
            dataSource={visibleOrders}
            expandable={{
              expandedRowRender: (order) => (
                <div className="expanded-order">
                  <p>
                    <strong>Email:</strong> {order.customer_email}
                  </p>
                  <p>
                    <strong>Статус:</strong> {orderStatusLabel(order.status)}
                  </p>
                  <p>
                    <strong>Комментарий:</strong> {order.comment || "Не указан"}
                  </p>
                  <p>
                    <strong>Адрес:</strong>{" "}
                    {order.address
                      ? `${order.address.city}, ${order.address.street}, ${order.address.building}`
                      : "Не указан"}
                  </p>
                  {order.payment_url ? (
                    <p>
                      <strong>Ссылка на оплату:</strong>{" "}
                      <a href={order.payment_url} target="_blank" rel="noreferrer">
                        Открыть ссылку
                      </a>
                    </p>
                  ) : null}
                  <p>
                    <strong>Этапы:</strong>{" "}
                    {[
                      order.confirmed_at ? `подтверждён ${formatDate(order.confirmed_at)}` : null,
                      order.paid_at ? `оплачен ${formatDate(order.paid_at)}` : null,
                      order.shipped_at ? `отправлен ${formatDate(order.shipped_at)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "ожидает подтверждения"}
                  </p>
                  <List
                    size="small"
                    dataSource={order.items}
                    renderItem={(item) => (
                      <List.Item>
                        {item.product_name_snapshot} × {item.quantity}
                        <strong>{formatPrice(item.unit_price)}</strong>
                      </List.Item>
                    )}
                  />
                </div>
              ),
            }}
            pagination={{ pageSize: 8 }}
            locale={{ emptyText: <Empty description="Заказов пока нет" /> }}
          />
        </Card>
      ),
    },
  ];

  if (!hasAccess) {
    return (
      <section className="site-shell content-panel">
        <div className="page-head">
          <div>
            <p className="eyebrow">Панель управления</p>
            <h1 className="page-title">заказы и каталог</h1>
          </div>
        </div>
        <Alert
          type="warning"
          showIcon
          message="Доступ ограничен"
          description="Для доступа к панели управления требуется учетная запись сотрудника."
        />
        <div className="button-row" style={{ marginTop: "1rem" }}>
          <Link href="/login" className="button-primary ant-button-link">
            Перейти ко входу
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="site-shell content-panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">Панель управления</p>
          <h1 className="page-title">заказы, товары и справочники</h1>
        </div>
        <p className="lead">
          Раздел для ежедневной работы с заказами, товарными карточками,
          категориями и брендами.
        </p>
      </div>

      {!canUseRealAdmin ? (
        <Alert
          type="info"
          showIcon
          className="admin-access-alert"
          message="Ограниченный режим"
          description="Сейчас доступен только просмотр. Для изменений требуется учетная запись сотрудника."
        />
      ) : null}

      <Tabs defaultActiveKey="overview" items={adminTabs} className="admin-tabs" />

      <Modal
        title={editingCategory ? "Изменить категорию" : "Новая категория"}
        open={categoryModalOpen}
        onCancel={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form<AdminCategoryCreatePayload>
          form={categoryForm}
          layout="vertical"
          onFinish={handleSaveCategory}
          className="admin-product-form"
        >
          <Form.Item label="Название" name="name" rules={[{ required: true }]}>
            <Input size="large" />
          </Form.Item>
          <Form.Item label="Slug" name="slug">
            <Input size="large" />
          </Form.Item>
          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            className="button-primary"
            loading={dictionarySubmitting}
          >
            {editingCategory ? "Сохранить изменения" : "Сохранить категорию"}
          </Button>
        </Form>
      </Modal>

      <Modal
        title={editingManufacturer ? "Изменить производителя" : "Новый производитель"}
        open={manufacturerModalOpen}
        onCancel={() => {
          setManufacturerModalOpen(false);
          setEditingManufacturer(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form<AdminManufacturerCreatePayload>
          form={manufacturerForm}
          layout="vertical"
          onFinish={handleSaveManufacturer}
          className="admin-product-form"
        >
          <Form.Item label="Название" name="name" rules={[{ required: true }]}>
            <Input size="large" />
          </Form.Item>
          <Form.Item label="Страна" name="country">
            <Input size="large" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            className="button-primary"
            loading={dictionarySubmitting}
          >
            {editingManufacturer ? "Сохранить изменения" : "Сохранить производителя"}
          </Button>
        </Form>
      </Modal>
    </section>
  );
}

function updateCollection<T>(
  current: T[],
  nextItem: T,
  isSame: (item: T) => boolean,
  sortBy: (a: T, b: T) => number,
) {
  const next = current.some(isSame)
    ? current.map((item) => (isSame(item) ? nextItem : item))
    : [...current, nextItem];
  return next.sort(sortBy);
}

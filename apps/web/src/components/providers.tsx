"use client";

import { App as AntdApp, ConfigProvider } from "antd";

import { AuthProvider } from "@/components/auth-provider";
import { CartProvider } from "@/components/cart-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#ff6b1f",
          colorText: "#181714",
          colorTextSecondary: "#6e675c",
          colorBgBase: "#fbf7f1",
          colorBorder: "rgba(24, 23, 20, 0.12)",
          colorBgContainer: "rgba(251, 247, 241, 0.86)",
          borderRadius: 18,
          borderRadiusLG: 28,
          boxShadowSecondary: "0 30px 90px rgba(43, 37, 28, 0.08)",
          fontFamily: "var(--font-body), sans-serif",
        },
        components: {
          Button: {
            controlHeight: 48,
            borderRadius: 16,
            fontWeight: 500,
          },
          Card: {
            borderRadiusLG: 28,
          },
          Input: {
            borderRadius: 18,
            activeBorderColor: "#ff6b1f",
            hoverBorderColor: "#ff6b1f",
          },
          InputNumber: {
            borderRadius: 18,
          },
          Select: {
            borderRadius: 18,
          },
          Tabs: {
            inkBarColor: "#ff6b1f",
            itemSelectedColor: "#181714",
            itemColor: "#6e675c",
          },
          Table: {
            borderColor: "rgba(24, 23, 20, 0.12)",
            headerBg: "rgba(255, 255, 255, 0.72)",
            rowHoverBg: "rgba(255, 107, 31, 0.06)",
          },
        },
      }}
    >
      <AntdApp>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

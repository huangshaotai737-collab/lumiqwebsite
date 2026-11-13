import { requireStaff } from "@/lib/auth/require-staff";
import { getCatalogWorkspace } from "@/features/catalog/service";
import { CatalogEditor } from "@/features/catalog/CatalogEditor";
export default async function CatalogPage() {
  const result = await getCatalogWorkspace();
  if (!result.ok)
    return <p role="alert">商品配置暫時不可用，或當前賬號沒有讀取權限。</p>;
  const actor = await requireStaff(["admin", "operations"]);
  return (
    <>
      <h1>產品與方案</h1>
      <p>商品售價需由管理員確認。訂單依商品設定的售價計算，官網顯示的參考價格不作為計價依據。</p>
      <CatalogEditor initial={result.data} readOnly={actor.role !== "admin"} />
    </>
  );
}

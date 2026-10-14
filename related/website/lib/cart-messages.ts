import type { Locale } from "@/i18n/routing";

const en = {
  title: "Your cart", open: "Open cart", close: "Close cart", add: "Add to cart", remove: "Remove", decrease: "Decrease quantity", increase: "Increase quantity", quantity: "Quantity",
  emptyTitle: "Make room for something wonderful", emptyBody: "Save the Lumiq products you like here, and come back to them whenever you want.", browse: "Explore products", continue: "Continue exploring",
  note: "Saved on this device only. This is a product selection, not an order. Payment is not available yet.", storageUnavailable: "Your browser has blocked local storage. Your selections will stay available until you leave or refresh this page.",
  referenceTotal: "Published-price reference total", noPublishedTotal: "Price to be announced", priceNote: "A reference only; this is not a checkout total.", pending: "Price to be announced", included: "Included with Lumiq Ola · not sold separately", interest: "Join the waitlist",
  unpriced: (count: number) => `${count} selection${count === 1 ? "" : "s"} without a standalone published price ${count === 1 ? "is" : "are"} excluded.`,
  countLabel: (count: number) => `${count} item${count === 1 ? "" : "s"}`, added: (name: string) => `${name} added to your cart`,
};

type CartMessages = typeof en;
const messages: Record<Locale, CartMessages> = {
  en,
  "zh-hant": {
    title: "購物車", open: "開啟購物車", close: "關閉購物車", add: "加入購物車", remove: "移除", decrease: "減少數量", increase: "增加數量", quantity: "數量",
    emptyTitle: "把喜歡的 Lumiq 留在這裡", emptyBody: "挑選想了解的產品，隨時回來查看。", browse: "探索產品", continue: "繼續探索",
    note: "選品只儲存在這台裝置，不會建立訂單，目前尚未開放付款。", storageUnavailable: "瀏覽器已停用本機儲存，選品會保留到離開或重新整理頁面為止。",
    referenceTotal: "已公布價格參考合計", noPublishedTotal: "價格待公布", priceNote: "此金額僅供參考，不是結帳金額。", pending: "價格待公布", included: "隨 Lumiq Ola 附送，不單獨販售", interest: "加入候補名單",
    unpriced: (count) => `另有 ${count} 件未公布單獨售價的選品，不計入合計。`, countLabel: (count) => `${count} 件選品`, added: (name) => `已將 ${name} 加入購物車`,
  },
  ja: {
    title: "カート", open: "カートを開く", close: "カートを閉じる", add: "カートに追加", remove: "削除", decrease: "数量を減らす", increase: "数量を増やす", quantity: "数量",
    emptyTitle: "お気に入りの Lumiq をここに", emptyBody: "気になる製品を保存して、いつでも見返せます。", browse: "製品を見る", continue: "製品選びを続ける",
    note: "この端末にのみ保存されます。注文は作成されず、お支払いはまだご利用いただけません。", storageUnavailable: "ブラウザーでローカル保存が無効になっています。ページを離れるか再読み込みするまで選択内容を保持します。",
    referenceTotal: "公開価格の参考合計", noPublishedTotal: "価格は後日発表", priceNote: "参考金額であり、お支払い金額ではありません。", pending: "価格は後日発表", included: "Lumiq Ola に付属・単体販売なし", interest: "ウェイトリストに登録",
    unpriced: (count) => `単体価格が未公開の ${count} 点は合計に含まれていません。`, countLabel: (count) => `${count} 点`, added: (name) => `${name} をカートに追加しました`,
  },
};

export function getCartMessages(locale: string): CartMessages {
  return messages[locale as Locale] ?? en;
}

import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";

// 每寄一封晨報就存一筆，成功或失敗都記錄
const sentBriefSchema = new Schema(
  {
    date: { type: String, required: true, index: true }, // 晨報日期 YYYY-MM-DD（台北時區）
    from: { type: String, required: true },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed"], required: true },
    resendId: { type: String }, // 寄送成功時 Resend 回傳的 email id
    error: { type: String }, // 寄送失敗的原因
    // 寄出當下的晨報內容
    summary: { type: Schema.Types.Mixed },
    weather: { type: Schema.Types.Mixed },
    stock: { type: Schema.Types.Mixed },
    news: { type: Schema.Types.Mixed },
    dataErrors: { type: Schema.Types.Mixed }, // 抓資料時各來源的錯誤
    html: { type: String, required: true },
  },
  { timestamps: true },
);

export type SentBrief = InferSchemaType<typeof sentBriefSchema>;

// 開發模式下 HMR 會保留舊的 model，先移除才能套用修改後的 schema
if (process.env.NODE_ENV === "development" && models.SentBrief) deleteModel("SentBrief");

export const SentBriefModel: Model<SentBrief> =
  (models.SentBrief as Model<SentBrief>) ?? model<SentBrief>("SentBrief", sentBriefSchema);

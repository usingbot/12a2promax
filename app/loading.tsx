import { BookOpen } from "lucide-react";
export default function Loading() {
  return (
    <main className="loading-page" role="status">
      <BookOpen />
      <h1>Đang mở lại những ký ức...</h1>
      <div className="skeleton" />
    </main>
  );
}

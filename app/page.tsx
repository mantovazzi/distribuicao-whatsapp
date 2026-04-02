"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({
  id,
  number,
  onRemove,
}: {
  id: string;
  number: string;
  onRemove: (n: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
        title="Arrastar para reordenar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>

      <span className="flex-1 font-mono text-gray-800">
        +{number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, "$1 ($2) $3-$4")}
      </span>

      <button
        onClick={() => {
          if (confirm(`Remover o número ${number}?`)) {
            onRemove(number);
          }
        }}
        className="text-red-400 hover:text-red-600 transition-colors"
        title="Remover número"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [numbers, setNumbers] = useState<string[]>([]);
  const [newNumber, setNewNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const baseUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
      : "";
  const redirectUrl = `${baseUrl}/api/redirect`;

  const showFeedback = useCallback(
    (type: "success" | "error", message: string) => {
      setFeedback({ type, message });
      setTimeout(() => setFeedback(null), 3000);
    },
    []
  );

  const fetchNumbers = useCallback(async () => {
    try {
      const res = await fetch("/api/numbers");
      const data = await res.json();
      setNumbers(data.numbers || []);
    } catch {
      showFeedback("error", "Erro ao carregar números");
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = newNumber.replace(/\D/g, "");

    if (!/^\d{10,}$/.test(cleaned)) {
      showFeedback("error", "Número inválido. Use apenas dígitos (mínimo 10).");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: cleaned }),
      });
      const data = await res.json();
      if (res.ok) {
        setNumbers(data.numbers);
        setNewNumber("");
        showFeedback("success", "Número adicionado!");
      } else {
        showFeedback("error", data.error);
      }
    } catch {
      showFeedback("error", "Erro ao adicionar");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemove(number: string) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/numbers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number }),
      });
      const data = await res.json();
      if (res.ok) {
        setNumbers(data.numbers);
        showFeedback("success", "Número removido!");
      } else {
        showFeedback("error", data.error);
      }
    } catch {
      showFeedback("error", "Erro ao remover");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = numbers.indexOf(active.id as string);
    const newIndex = numbers.indexOf(over.id as string);
    const newOrder = arrayMove(numbers, oldIndex, newIndex);
    setNumbers(newOrder);

    try {
      await fetch("/api/numbers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: newOrder }),
      });
    } catch {
      showFeedback("error", "Erro ao reordenar");
      fetchNumbers();
    }
  }

  async function handleResetCounter() {
    if (!confirm("Resetar o contador de distribuição?")) return;

    setActionLoading(true);
    try {
      await fetch("/api/counter", { method: "DELETE" });
      showFeedback("success", "Contador resetado!");
    } catch {
      showFeedback("error", "Erro ao resetar");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(redirectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Distribuição WhatsApp
          </h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Feedback */}
        {feedback && (
          <div
            className={`px-4 py-3 rounded-lg text-sm font-medium ${
              feedback.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Redirect URL */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL de Redirecionamento
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={redirectUrl}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono text-gray-600"
            />
            <button
              onClick={handleCopyUrl}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>

        {/* Add Number */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="5511999991111"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
            >
              Adicionar
            </button>
          </form>
        </div>

        {/* Numbers List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">
              Números cadastrados ({numbers.length})
            </h2>
            <button
              onClick={handleResetCounter}
              disabled={actionLoading}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
            >
              Resetar contador
            </button>
          </div>

          {numbers.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
              Nenhum número cadastrado
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={numbers}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {numbers.map((number) => (
                    <SortableItem
                      key={number}
                      id={number}
                      number={number}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </main>
    </div>
  );
}

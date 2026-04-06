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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  const str = String(number);
  const formatted = str.replace(
    /(\d{2})(\d{2})(\d{4,5})(\d{4})/,
    "+$1 ($2) $3-$4"
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>

      <span className="flex-1 font-mono text-sm">{formatted}</span>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="ghost" size="icon-xs">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </Button>
          }
        />
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover número</AlertDialogTitle>
            <AlertDialogDescription>
              Remover {formatted} da lista?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => onRemove(number)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    msg: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
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
    (type: "success" | "error", msg: string) => {
      setFeedback({ type, msg });
      setTimeout(() => setFeedback(null), 3000);
    },
    []
  );

  const fetchNumbers = useCallback(async () => {
    try {
      const res = await fetch("/api/numbers");
      const data = await res.json();
      setNumbers((data.numbers || []).map(String));
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
      showFeedback("error", "Número inválido (mín. 10 dígitos).");
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

  function handleCopy() {
    navigator.clipboard.writeText(redirectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function buildLinkWithText() {
    const text = linkText.trim();
    if (!text) return redirectUrl;
    return `${redirectUrl}?text=${encodeURIComponent(text)}`;
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(buildLinkWithText());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6 sm:py-10 space-y-4">
      {feedback && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <Card size="sm">
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly value={redirectUrl} className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent className="space-y-2">
          <label className="text-xs text-muted-foreground">
            Criar link com texto personalizado
          </label>
          <Input
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            placeholder="Olá! Vi seu anúncio e tenho interesse..."
          />
          <div className="flex gap-2">
            <Input
              readOnly
              value={buildLinkWithText()}
              className="font-mono text-xs"
            />
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {linkCopied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          placeholder="5511999991111"
        />
        <Button type="submit" disabled={actionLoading} size="sm">
          Adicionar
        </Button>
      </form>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {numbers.length} número{numbers.length !== 1 && "s"}
          </span>
          <div className="flex items-center gap-1">
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={actionLoading}
                    className="text-muted-foreground"
                  >
                    Resetar
                  </Button>
                }
              />
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetar contador</AlertDialogTitle>
                  <AlertDialogDescription>
                    A distribuição voltará ao primeiro número da lista.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetCounter}>
                    Resetar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="destructive"
              size="xs"
              onClick={handleLogout}
            >
              Sair
            </Button>
          </div>
        </div>

        {numbers.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
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
              <div className="space-y-1.5">
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
    </div>
  );
}

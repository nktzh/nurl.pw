"use client";

import { ArrowLeft, FolderPlus, FolderSearch, InfoCircle } from "@untitledui/icons";
import { useState, type ReactNode } from "react";
import { About } from "@/features/about/About";
import { CreateDrop } from "@/features/create-drop/CreateDrop";
import { DropCreatedView } from "@/features/drop-created/DropCreatedView";
import { OpenDrop } from "@/features/open-drop/OpenDrop";
import type { DropCreated } from "@/shared/lib/api";
import { NavBar } from "@/shared/ui/NavBar";
import ui from "@/shared/ui/ui.module.css";

type Tab = "create" | "open" | "about";

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: "create", label: "Создать", icon: <FolderPlus size={16} /> },
  { key: "open", label: "Открыть", icon: <FolderSearch size={16} /> },
  { key: "about", label: "О проекте", icon: <InfoCircle size={16} /> },
];

export function HomeScreen() {
  const [tab, setTab] = useState<Tab>("create");
  const [created, setCreated] = useState<DropCreated | null>(null);

  const nav = created
    ? [
        {
          key: "back",
          label: "Отправить ещё",
          icon: <ArrowLeft size={16} />,
          onClick: () => {
            setCreated(null);
            setTab("create");
          },
        },
      ]
    : TABS.map((t) => ({ ...t, active: t.key === tab, onClick: () => setTab(t.key) }));

  return (
    <main className={ui.shell}>
      {created ? (
        <DropCreatedView drop={created} onDeleted={() => setCreated(null)} />
      ) : (
        <>
          {/* Kept mounted so selected files survive tab switches. */}
          <div style={{ display: tab === "create" ? "contents" : "none" }}>
            <CreateDrop onCreated={setCreated} />
          </div>
          {tab === "open" && <OpenDrop />}
          {tab === "about" && <About />}
        </>
      )}
      <NavBar items={nav} />
    </main>
  );
}

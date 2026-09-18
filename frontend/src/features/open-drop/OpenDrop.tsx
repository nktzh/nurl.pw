"use client";

import { FolderSearch } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CODE_LENGTH, NAME_ERROR, NAME_PATTERN } from "@/shared/lib/config";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { CodeInput } from "@/shared/ui/CodeBoxes";
import { TextField } from "@/shared/ui/TextField";
import ui from "@/shared/ui/ui.module.css";
import s from "./open-drop.module.css";

export function OpenDrop() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const open = (key: string) => {
    setPending(true);
    router.push(`/d/${encodeURIComponent(key)}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length === CODE_LENGTH) return open(code);
    if (name) {
      if (!NAME_PATTERN.test(name)) return setError(NAME_ERROR);
      return open(name);
    }
    setError(code ? "Идентификатор состоит из 6 символов" : "Введите идентификатор или имя папки");
  };

  return (
    <form className={`${ui.card} ${s.card} ${ui.enter}`} onSubmit={submit} noValidate>
      <div className={s.inner}>
        <header className={s.head}>
          <span className={s.icon}>
            <FolderSearch size={22} />
          </span>
          <h1 className={s.title}>Открыть папку</h1>
          <p className={s.subtitle}>Введите 6-значный идентификатор, который вам прислали</p>
        </header>

        <CodeInput
          value={code}
          onChange={(v) => {
            setCode(v);
            setError(null);
            if (v) setName("");
          }}
          onComplete={() => {
            // Wait for the last character to render before navigating.
            requestAnimationFrame(() => document.getElementById("open-submit")?.focus());
          }}
        />

        <div className={s.divider}>
          <span>или по имени папки</span>
        </div>

        <TextField
          placeholder="MyFolder"
          value={name}
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="Имя папки"
          className={s.nameField}
          onChange={(e) => {
            setName(e.target.value.replace(/\s/g, ""));
            setError(null);
            if (e.target.value) setCode("");
          }}
        />

        {error && <Alert>{error}</Alert>}

        <Button id="open-submit" type="submit" block disabled={pending}>
          {pending ? "Открываем…" : "Открыть папку"}
        </Button>
      </div>
    </form>
  );
}

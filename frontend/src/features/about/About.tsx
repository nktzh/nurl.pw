import { Clock, Lock01, UploadCloud02, Zap } from "@untitledui/icons";
import { RETENTIONS } from "@/shared/lib/config";
import { formatGb } from "@/shared/lib/format";
import ui from "@/shared/ui/ui.module.css";
import s from "./about.module.css";

const FEATURES = [
  {
    icon: <UploadCloud02 size={20} />,
    title: "Без регистрации",
    text: "Никаких аккаунтов и лишних шагов: перетащите файлы и получите ссылку.",
  },
  {
    icon: <Zap size={20} />,
    title: "На любое устройство",
    text: "Откройте ссылку, QR-код или 6-значный код на телефоне, планшете или ноутбуке.",
  },
  {
    icon: <Lock01 size={20} />,
    title: "Приватно",
    text: "Защитите папку паролем или сделайте ссылку одноразовой.",
  },
];

export function About() {
  return (
    <section className={`${ui.card} ${s.card} ${ui.enter}`}>
      <div className={s.inner}>
        <h1 className={s.title}>О проекте</h1>
        <p className={s.lead}>
          Быстрая передача файлов между устройствами без регистрации. Загрузите файл, получите ссылку
          или QR-код и откройте его на любом другом устройстве.
        </p>

        <ul className={s.features}>
          {FEATURES.map((f) => (
            <li key={f.title} className={s.feature}>
              <span className={s.featureIcon}>{f.icon}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className={s.rules}>
          <h3>
            <Clock size={16} /> Размер обратно пропорционален сроку хранения
          </h3>
          <div className={s.ruleGrid}>
            {RETENTIONS.map((r) => (
              <div key={r.value} className={s.rule}>
                <strong>{formatGb(r.limit)}</strong>
                <span>{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className={s.footnote}>Проект полностью некоммерческий.</p>
      </div>
    </section>
  );
}

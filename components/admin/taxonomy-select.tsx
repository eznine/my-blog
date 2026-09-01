'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * 分类 / 章节选择器 —— 替代原生 <input list>（datalist）。
 *
 * 原生 datalist 的毛病：输入框已有值时，候选被过滤得只剩匹配那一个，
 * 想换选项必须先把内容删光，且样式无法自定义。这里统一改成项目后台风格：
 *
 *  - chips   候选常驻在输入框下方，始终全部可见，点一下直接替换，当前值高亮。
 *            用于空间充足的弹窗（批量导入 / 批量修改）。
 *  - dropdown 点击输入框展开下拉面板（未输入时列出全部候选，输入时过滤），
 *            点选即填充。用于紧凑的编辑器表单。
 */
interface TaxonomySelectProps {
  value: string;
  onChange: (v: string) => void;
  /** 点选候选后的附加回调（如大类改变时清空章节） */
  onPick?: () => void;
  options: string[];
  placeholder?: string;
  hint?: ReactNode;
  variant?: 'chips' | 'dropdown';
  disabled?: boolean;
  className?: string;
}

const inputBase =
  'w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-[15px] text-ink transition-all focus:border-accent/60 focus:outline-none placeholder:text-ink-faint disabled:opacity-50';

function Chips({
  value,
  onChange,
  onPick,
  options,
  placeholder,
  hint,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick?: () => void;
  options: string[];
  placeholder?: string;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={inputBase + (value ? ' pr-9' : '')}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              onPick?.();
            }}
            title="清除"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[15px] leading-none text-ink-faint transition-colors hover:text-accent"
          >
            ×
          </button>
        )}
      </div>
      <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                onPick?.();
              }}
              className={`rounded-lg border px-3 py-1 text-[13.5px] transition-all ${
                active
                  ? 'border-accent bg-accent/10 font-medium text-accent'
                  : 'border-line bg-panel text-ink-soft hover:border-accent/50 hover:text-accent'
              }`}
            >
              {opt}
            </button>
          );
        })}
        {options.length === 0 && <span className="text-[12.5px] text-ink-faint">暂无候选，可直接输入新名称</span>}
      </div>
      {hint && <div className="mt-2 text-[12px] leading-relaxed text-ink-faint">{hint}</div>}
    </div>
  );
}

function Dropdown({
  value,
  onChange,
  onPick,
  options,
  placeholder,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick?: () => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  /** 用户键盘输入的值；null = 未在输入态 → 面板展示全部候选（当前值只高亮，不参与过滤） */
  const [typed, setTyped] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const shown = useMemo(() => {
    if (typed === null) return options;
    const q = typed.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, typed]);

  const pick = (opt: string) => {
    onChange(opt);
    onPick?.();
    setTyped(null);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className={'relative ' + (className || '')}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onFocus={() => {
          setOpen(true);
          setTyped(null);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setTyped(e.target.value);
        }}
        placeholder={placeholder}
        className={inputBase + ' pr-9'}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-faint transition-colors hover:text-accent"
        aria-label={open ? '收起候选' : '展开候选'}
      >
        {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-panel-solid py-1 shadow-xl">
          {shown.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => pick(opt)}
              className={`block w-full px-3.5 py-2 text-left text-[14px] transition-colors ${
                opt === value
                  ? 'bg-accent/10 font-medium text-accent'
                  : 'hover:bg-accent/5 hover:text-accent'
              }`}
            >
              {opt}
            </button>
          ))}
          {shown.length === 0 && <p className="px-3.5 py-2 text-[13px] text-ink-faint">无匹配候选，可直接输入新名称</p>}
        </div>
      )}
    </div>
  );
}

export function TaxonomySelect(props: TaxonomySelectProps) {
  if (props.variant === 'dropdown') {
    const { variant: _v, ...rest } = props;
    return <Dropdown {...rest} className={props.className} />;
  }
  const { options, value, onChange, onPick, placeholder, hint, disabled } = props;
  return (
    <div className={props.className}>
      <Chips
        options={options}
        value={value}
        onChange={onChange}
        onPick={onPick}
        placeholder={placeholder}
        hint={hint}
        disabled={disabled}
      />
    </div>
  );
}
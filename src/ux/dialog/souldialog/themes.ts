// ============================================================================
// core/themes.ts  — 공통 변수/쉘/위젯 CSS (전역 1회 + ShadowRoot 주입)
// ============================================================================
import { css } from './dlgstyle';

/* -------------------------------------------------------------------------- */
/* 1) 공통 변수: inset 그림자 제거                                            */
/* -------------------------------------------------------------------------- */
export const BASE_VARS = css`
  :host, :root {
    --gnx-bg:#0b0f16;
    --gnx-ui-bg:#0e1116cc; --gnx-ui-bg-strong:#0e1116f2;
    --gnx-ui-fg:#e9edf3; --gnx-ui-sub:#b7c0cf;
    --gnx-ui-accent:#d8b66b; --gnx-ui-accent-weak:#9a7c3e;
    --gnx-ui-coin:#ffd463;
    --gnx-radius:16px; --gnx-blur:8px;
    --gnx-shadow:0 8px 40px rgba(0,0,0,.55); /* inset 제거 */
    --gnx-border:1px solid rgba(216,182,107,.32);
    --gnx-card-glow:0 0 18px rgba(216,182,107,.28);
    --gnx-rar-common:#aeb6c8; --gnx-rar-rare:#58a6ff; --gnx-rar-epic:#d87cff;
  }
  /* [추가] 이미지 아이콘 스타일: 부모 박스에 꽉 차게 */
  .gnx-img-icon {
    width: 100%;
    height: 100%;
    object-fit: contain; /* 비율 유지하며 맞춤 */
    display: block;
    pointer-events: none; /* 클릭 통과 (드래그 등 간섭 방지) */
  }
`;

/* -------------------------------------------------------------------------- */
/* 2) 쉘/다이얼로그                                                            */
/*  - blur는 ::before에서 처리 + z-index:-1 로 컨텐츠 뒤로                     */
/*  - .gnx-dialog 배경은 투명(색은 ::before가 담당)                           */
/*  - scale 제거, 클리핑 강화                                                  */
/*  - 헤더 대비/제목 가독성 강화                                               */
/* -------------------------------------------------------------------------- */
export const SHELL_BASE = css`
  .gnx-overlay{
    position:fixed; inset:0;
    display:flex; align-items:center; justify-content:center;
    z-index:2147483000;
    background:radial-gradient(1500px 800px at 50% 30%, rgba(0,0,0,.45), rgba(0,0,0,.75));
  }

  .gnx-dialog{
    position:relative;
    width:min(860px,calc(100% - 32px));
    max-height:80vh;
    display:flex; flex-direction:column;

    /* 배경은 ::before가 칠한다 */
    background:transparent;
    border:var(--gnx-border);
    border-radius:var(--gnx-radius);
    box-shadow:var(--gnx-shadow);
    outline:none;

    /* 라운드 모서리 클리핑 강화 */
    overflow:hidden;
    background-clip:padding-box;
    contain:paint;

    /* 애니메이션에서 scale 제거 */
    transform:translateY(10px);
    opacity:.0;
    transition:transform .2s ease, opacity .2s ease;
  }

  /* 컨텐츠 뒤쪽에서 블러 + 배경색 칠함 */
  .gnx-dialog::before{
    content:"";
    position:absolute; inset:0;
    border-radius:inherit;
    z-index:-1;                /* 컨텐츠 뒤 */
    pointer-events:none;
    background:var(--gnx-ui-bg);      /* 패널색 */
    backdrop-filter:blur(var(--gnx-blur));
    -webkit-backdrop-filter:blur(var(--gnx-blur));
  }

  .gnx-dialog--wide{ width:min(1080px,calc(100% - 32px)); }

  .gnx-overlay[data-open="true"] .gnx-dialog{
    transform:translateY(0);
    opacity:1;
  }

  .gnx-dialog__header{
    display:flex; align-items:center; gap:10px;
    padding:14px 16px 10px;
    border-bottom:1px solid rgba(255,255,255,.08);

    /* 헤더 대비 강화(조금 더 불투명한 그라데이션) */
    background:linear-gradient(
      180deg,
      color-mix(in oklab, var(--gnx-ui-bg-strong) 96%, transparent) 0%,
      color-mix(in oklab, var(--gnx-ui-bg-strong) 70%, transparent) 60%,
      transparent 100%
    );
    color: var(--gnx-ui-fg);

    /* 헤더 그라데이션 누수 방지 */
    overflow:hidden;
    border-top-left-radius:var(--gnx-radius);
    border-top-right-radius:var(--gnx-radius);
  }

  .gnx-dialog__title{
    font-weight:700; letter-spacing:.2px; font-size:16px;
    color:inherit; opacity:1; filter:none;
    -webkit-font-smoothing: antialiased;
    text-shadow: 0 1px 0 rgba(0,0,0,.20); /* 옵션: 윤곽 보강 */
  }

  .gnx-dialog__body{
    flex:1; min-height:0; padding:16px; display:grid; gap:14px; overflow:auto;
  }
  .gnx-dialog__actions{
    display:flex; gap:10px; justify-content:flex-end; padding:0 16px 14px;
  }

  .gnx-btn{
    appearance:none;
    border:1px solid rgba(255,255,255,.18);
    color:var(--gnx-ui-fg);
    background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
    padding:10px 14px; border-radius:12px; cursor:pointer;
    font-weight:600; letter-spacing:.2px;
  }
  .gnx-btn--accent{
    border-color:var(--gnx-ui-accent-weak);
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.25),var(--gnx-card-glow);
    background:linear-gradient(180deg,color-mix(in oklab,var(--gnx-ui-accent) 25%,transparent),rgba(255,255,255,.02));
    color:#fff;
  }
  .gnx-btn--danger{
    border-color:rgba(255,90,106,.35); color:#fff;
    background:linear-gradient(180deg,rgba(255,255,255,.25),rgba(255,255,255,.12));
  }

  .gnx-text{ color:var(--gnx-ui-sub); line-height:1.55; }

  .gnx-bar{
    height:6px; border-radius:6px;
    background:rgba(255,255,255,.12);
    position:relative; overflow:hidden;
  }
  .gnx-bar>i{
    position:absolute; left:0; top:0; bottom:0;
    background:color-mix(in oklab,var(--gnx-ui-accent) 60%,transparent);
  }

  .gnx-card__meta{
    font-size:12px; display:inline-block; padding:2px 8px;
    border-radius:999px; background:rgba(255,255,255,.06);
  }
  .gnx-rar-common{ color:var(--gnx-rar-common); box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--gnx-rar-common) 60%, transparent); }
  .gnx-rar-rare{   color:var(--gnx-rar-rare);   box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--gnx-rar-rare)   60%, transparent); }
  .gnx-rar-epic{   color:var(--gnx-rar-epic);   box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--gnx-rar-epic)   60%, transparent); }
`;

/* -------------------------------------------------------------------------- */
/* 3) 카드/리스트/툴팁 (공통 위젯 스타일)                                       */
/* -------------------------------------------------------------------------- */
export const WIDGET_BASE = css`
  /* 기존 스타일 유지 */
  .gnx-cardgrid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  .gnx-card{
    display:grid; gap:6px; text-align:left;
    background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));
    border:1px solid rgba(255,255,255,.12);
    border-radius:14px; padding:12px; cursor:pointer;
    transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease;
    color:var(--gnx-ui-fg); line-height:1.35;
  }
  .gnx-card:hover{ transform:translateY(-2px); border-color:var(--gnx-ui-accent); box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 50%,transparent); }
  .gnx-card__title{ font-weight:700; letter-spacing:.2px; display:block; }

  .gnx-list{ display:grid; gap:8px; }
  .gnx-rowitem{
    display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:center;
    border:1px solid rgba(255,255,255,.10); border-radius:12px; padding:10px 12px;
    background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
  }
  .gnx-row__icon{
    width:36px; height:36px; border-radius:8px;
    display:grid; place-items:center; background:rgba(255,255,255,.06); font-size:20px;
  }

  /* [추가/수정] 공통 툴팁 스타일 (.gnx-tip) */
  .gnx-tip {
    position: fixed; /* [중요] 화면 기준으로 떠있게 함 */
    z-index: 2147483647; /* 최상단 레이어 */
    
    min-width: 240px;
    max-width: 360px;
    padding: 12px;
    
    background: linear-gradient(180deg, rgba(30,33,40,0.98), rgba(20,23,30,0.99));
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 12px;
    box-shadow: 0 8px 40px rgba(0,0,0,.65);
    backdrop-filter: blur(4px);
    
    color: var(--gnx-ui-fg);
    pointer-events: none; /* 기본적으로 클릭 통과 */
    
    opacity: 0;
    transition: opacity .08s ease;
  }

  .gnx-tip[data-show="true"] { opacity: 1; }
  .gnx-tip[data-pinned="true"] { pointer-events: auto; } /* 고정되면 클릭 가능 */

  /* 툴팁 내부 타이틀 */
  .gnx-tip .tt-title { 
    font-weight:700; font-size: 15px; margin-bottom:8px; 
    display:flex; align-items:center; gap:8px; 
  }
  
  /* 툴팁 내부 스탯 */
  .gnx-tip .tt-stats { 
    margin: 10px 0; padding-top: 10px; 
    border-top: 1px solid rgba(255,255,255,0.1); 
    display: flex; flex-direction: column; gap: 4px; 
  }
  .tt-stat-row { font-size: 13px; color: #8ab4f8; display: flex; justify-content: space-between; }
  .tt-stat-row.enchant { color: #d87cff; }

  /* 툴팁 내부 설명 */
  .gnx-tip .tt-desc { 
    margin-top:8px; color: var(--gnx-ui-sub); 
    line-height:1.5; font-size: 13px; font-style: italic; 
  }

  /* 툴팁 내부 액션 버튼 영역 */
  .gnx-tip .tt-actions { 
    margin-top:12px; padding-top: 8px; 
    border-top: 1px solid rgba(255,255,255,0.1); 
    display:flex; gap:6px; justify-content:flex-end; flex-wrap: wrap;
  }
  
  /* 툴팁 버튼 스타일 */
  .tt-btn { 
    appearance:none; border:1px solid rgba(255,255,255,.18); 
    color:var(--gnx-ui-fg); background:rgba(255,255,255,.05); 
    padding:4px 10px; border-radius:8px; cursor:pointer; font-weight:600; font-size:12px;
  }
  .tt-btn--accent {
    border-color:var(--gnx-ui-accent-weak);
    background:color-mix(in oklab, var(--gnx-ui-accent) 20%, transparent);
    color: #fff;
  }
`;
/* -------------------------------------------------------------------------- */
/* 4) 테마 변형 (색상만)                                                       */
/* -------------------------------------------------------------------------- */
export const THEMES: Record<string, string> = {
  souls: BASE_VARS,
  pastel: css`
    :host, :root {
      --gnx-bg:#10131a;
      --gnx-ui-bg:#1a1f2acc; --gnx-ui-bg-strong:#1a1f2af2;
      --gnx-ui-fg:#f6f7fb; --gnx-ui-sub:#cbd5e1;
      --gnx-ui-accent:#a7e3ff; --gnx-ui-accent-weak:#6fb9df;
      --gnx-coin:#ffe19a; --gnx-rar-common:#b7c2cc; --gnx-rar-rare:#7fd2ff; --gnx-rar-epic:#ffb0f4;
    }
  `,
  neon: css`
    :host, :root {
      --gnx-bg:#07090e;
      --gnx-ui-bg:#0b1020cc; --gnx-ui-bg-strong:#0b1020f2;
      --gnx-ui-fg:#e9f5ff; --gnx-ui-sub:#9bb3d1;
      --gnx-ui-accent:#00f0ff; --gnx-ui-accent-weak:#00b3c3;
      --gnx-coin:#ffe56b; --gnx-rar-common:#8ba2b8; --gnx-rar-rare:#34d3ff; --gnx-rar-epic:#ff78ff;
    }
  `,
  parchment: css`
    :host, :root {
      --gnx-bg:#15140f;
      --gnx-ui-bg:#2a261bcc; --gnx-ui-bg-strong:#2a261bf2;
      --gnx-ui-fg:#f3e9da; --gnx-ui-sub:#e6d5b8;
      --gnx-ui-accent:#e7c176; --gnx-ui-accent-weak:#b28d4a;
      --gnx-coin:#ffcf73; --gnx-rar-common:#d7cab3; --gnx-rar-rare:#9ed0ff; --gnx-rar-epic:#f5a8ff;
    }
  `,
  forest: css`
    :host, :root {
      --gnx-bg:#0b1210;
      --gnx-ui-bg:#10201acc; --gnx-ui-bg-strong:#10201af2;
      --gnx-ui-fg:#e9ffe9; --gnx-ui-sub:#b7d5b7;
      --gnx-ui-accent:#74d279; --gnx-ui-accent-weak:#499b50;
      --gnx-coin:#f3ff9a; --gnx-rar-common:#b7c8b7; --gnx-rar-rare:#76ff90; --gnx-rar-epic:#b1ffea;
    }
  `,
};

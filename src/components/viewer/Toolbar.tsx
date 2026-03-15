import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Trash2,
  Maximize2,
  Info,
  Grid3X3,
  PanelLeftClose,
  PanelLeftOpen,
  PanelBottomClose,
  PanelBottomOpen,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  BookmarkCheck,
  ClipboardCheck,
  Filter,
  MonitorCog,
  Sun,
  Moon,
} from 'lucide-react';
import { useState } from 'react';
import GridSelector from './GridSelector';

interface ToolbarProps {
  themeMode: 'system' | 'light' | 'dark';
  onThemeModeChange: (mode: 'system' | 'light' | 'dark') => void;
  onOpenFolder: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onPrev: () => void;
  onNext: () => void;
  onClearAll: () => void;
  onToggleFullscreen: () => void;
  onToggleInfo: () => void;
  onGridChange: (rows: number, cols: number) => void;
  onTogglePanel: () => void;
  onToggleFilmstrip: () => void;
  onToggleRename: () => void;
  onToggleSearch: () => void;
  onOpenApplyPreview: () => void;
  onToggleCurrentMarker: () => void;
  onToggleShowMarkedOnly: () => void;
  zoom: number;
  imageCount: number;
  currentIndex: number;
  canPrev: boolean;
  canNext: boolean;
  gridRows: number;
  gridCols: number;
  showPanel: boolean;
  showFilmstrip: boolean;
  showRename: boolean;
  showSearch: boolean;
  isCurrentMarked: boolean;
  markedCount: number;
  showMarkedOnly: boolean;
  pendingChangeCount: number;
}

function ToolButton({
  onClick,
  children,
  title,
  disabled,
  active,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? 'bg-primary/20 text-primary hover:bg-primary/30'
          : 'text-secondary-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}

function ThemeButton({
  mode,
  currentMode,
  title,
  onClick,
  children,
}: {
  mode: 'system' | 'light' | 'dark';
  currentMode: 'system' | 'light' | 'dark';
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const active = mode === currentMode;
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors ${
        active
          ? 'bg-primary/20 text-primary hover:bg-primary/30'
          : 'text-secondary-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

export default function Toolbar(props: ToolbarProps) {
  const [showGrid, setShowGrid] = useState(false);
  const hasImages = props.imageCount > 0;

  return (
    <div className="flex h-10 select-none items-center gap-0.5 border-b border-toolbar-border bg-toolbar-bg px-2 font-display text-xs">
      <ToolButton onClick={props.onOpenFolder} title={'\uD3F4\uB354 \uC5F4\uAE30'}>
        <FolderOpen size={16} />
      </ToolButton>

      <Divider />

      <ThemeButton
        mode="system"
        currentMode={props.themeMode}
        title={'\uC2DC\uC2A4\uD15C \uD14C\uB9C8'}
        onClick={() => props.onThemeModeChange('system')}
      >
        <MonitorCog size={16} />
      </ThemeButton>
      <ThemeButton
        mode="light"
        currentMode={props.themeMode}
        title={'\uB77C\uC774\uD2B8 \uBAA8\uB4DC'}
        onClick={() => props.onThemeModeChange('light')}
      >
        <Sun size={16} />
      </ThemeButton>
      <ThemeButton
        mode="dark"
        currentMode={props.themeMode}
        title={'\uB2E4\uD06C \uBAA8\uB4DC'}
        onClick={() => props.onThemeModeChange('dark')}
      >
        <Moon size={16} />
      </ThemeButton>

      <Divider />

      <ToolButton onClick={props.onTogglePanel} title={'\uC88C\uCE21 \uD0D0\uC0C9\uCC3D \uD1A0\uAE00'} active={props.showPanel}>
        {props.showPanel ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </ToolButton>
      <ToolButton onClick={props.onToggleFilmstrip} title={'\uD558\uB2E8 \uD544\uB984\uC2A4\uD2B8\uB9BD \uD1A0\uAE00'} active={props.showFilmstrip}>
        {props.showFilmstrip ? <PanelBottomClose size={16} /> : <PanelBottomOpen size={16} />}
      </ToolButton>
      <ToolButton onClick={props.onToggleRename} title={'\uC774\uB984\uBCC0\uACBD \uC791\uC5C5\uB300 \uD1A0\uAE00'} active={props.showRename}>
        {props.showRename ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
      </ToolButton>
      <ToolButton onClick={props.onToggleSearch} title={'\uAC80\uC0C9/\uD544\uD130'} active={props.showSearch}>
        <Filter size={16} />
      </ToolButton>

      <Divider />

      <ToolButton onClick={props.onPrev} title={'\uC774\uC804 \uC774\uBBF8\uC9C0'} disabled={!hasImages || !props.canPrev}>
        <ChevronLeft size={16} />
      </ToolButton>
      <ToolButton onClick={props.onNext} title={'\uB2E4\uC74C \uC774\uBBF8\uC9C0'} disabled={!hasImages || !props.canNext}>
        <ChevronRight size={16} />
      </ToolButton>

      <Divider />

      <ToolButton onClick={props.onZoomIn} title={'\uD655\uB300 (+)'} disabled={!hasImages}>
        <ZoomIn size={16} />
      </ToolButton>
      <ToolButton onClick={props.onZoomOut} title={'\uCD95\uC18C (-)'} disabled={!hasImages}>
        <ZoomOut size={16} />
      </ToolButton>
      <ToolButton onClick={props.onFitToScreen} title={'\uD654\uBA74\uC5D0 \uB9DE\uCD94\uAE30'} disabled={!hasImages}>
        <Maximize size={16} />
      </ToolButton>

      {hasImages && <span className="mx-1 text-muted-foreground">{Math.round(props.zoom * 100)}%</span>}

      <Divider />

      <ToolButton onClick={props.onRotateLeft} title={'\uC67C\uCABD \uD68C\uC804'} disabled={!hasImages}>
        <RotateCcw size={16} />
      </ToolButton>
      <ToolButton onClick={props.onRotateRight} title={'\uC624\uB978\uCABD \uD68C\uC804'} disabled={!hasImages}>
        <RotateCw size={16} />
      </ToolButton>

      <Divider />

      <ToolButton
        onClick={props.onToggleCurrentMarker}
        title={'\uD604\uC7AC \uC774\uBBF8\uC9C0\uB97C \uD540\uC73C\uB85C \uD45C\uC2DC'}
        disabled={!hasImages}
        active={props.isCurrentMarked}
      >
        <Pin size={16} className={props.isCurrentMarked ? 'fill-primary' : ''} />
      </ToolButton>
      <ToolButton
        onClick={props.onToggleShowMarkedOnly}
        title={'\uD540\uB41C \uC774\uBBF8\uC9C0\uB9CC \uBCF4\uAE30'}
        disabled={props.markedCount === 0 && !props.showMarkedOnly}
        active={props.showMarkedOnly}
      >
        <div className="relative">
          <BookmarkCheck size={16} />
          {props.markedCount > 0 && (
            <span className="absolute -right-1.5 -top-1 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-primary px-0.5 text-[8px] leading-none text-primary-foreground">
              {props.markedCount}
            </span>
          )}
        </div>
      </ToolButton>

      <Divider />

      <div className="relative">
        <ToolButton onClick={() => setShowGrid((v) => !v)} title={'\uBA40\uD2F0\uBDF0 \uC120\uD0DD'} disabled={!hasImages}>
          <Grid3X3 size={16} />
        </ToolButton>
        {showGrid && (
          <div className="absolute left-0 top-full z-50 mt-1" onMouseLeave={() => setShowGrid(false)}>
            <GridSelector
              currentRows={props.gridRows}
              currentCols={props.gridCols}
              onSelect={(rows, cols) => {
                props.onGridChange(rows, cols);
                setShowGrid(false);
              }}
            />
          </div>
        )}
      </div>

      <ToolButton onClick={props.onToggleInfo} title={'\uC774\uBBF8\uC9C0 \uC815\uBCF4'} disabled={!hasImages}>
        <Info size={16} />
      </ToolButton>
      <ToolButton onClick={props.onToggleFullscreen} title={'\uC804\uCCB4 \uD654\uBA74'} disabled={!hasImages}>
        <Maximize2 size={16} />
      </ToolButton>

      <div className="flex-1" />

      <button
        onClick={props.onOpenApplyPreview}
        disabled={props.pendingChangeCount === 0}
        className="flex h-8 items-center gap-1.5 rounded-sm border border-border px-2 text-secondary-foreground hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        title={'\uC801\uC6A9 \uC804 \uD655\uC778'}
      >
        <ClipboardCheck size={14} />
        <span>{'\uAC80\uD1A0/\uC801\uC6A9'}</span>
        {props.pendingChangeCount > 0 && (
          <span className="flex h-4 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground">
            {props.pendingChangeCount}
          </span>
        )}
      </button>

      {hasImages && (
        <span className="ml-3 mr-2 text-muted-foreground">
          {props.currentIndex + 1} / {props.imageCount}
        </span>
      )}

      <ToolButton onClick={props.onClearAll} title={'\uBAA8\uB450 \uC81C\uAC70'} disabled={!hasImages}>
        <Trash2 size={16} />
      </ToolButton>
    </div>
  );
}

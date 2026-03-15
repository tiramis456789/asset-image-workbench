import { Loader2, X } from 'lucide-react';

type FilterMode = 'name' | 'pin' | 'exif';
type PinFilterMode = 'all' | 'marked' | 'unmarked';

interface SearchFilterDialogProps {
  isOpen: boolean;
  mode: FilterMode;
  nameQuery: string;
  pinMode: PinFilterMode;
  exifQuery: string;
  knownExifTags: string[];
  filteredCount: number;
  totalCount: number;
  exifIndexedCount: number;
  exifLoading: boolean;
  onClose: () => void;
  onModeChange: (mode: FilterMode) => void;
  onNameQueryChange: (value: string) => void;
  onPinModeChange: (mode: PinFilterMode) => void;
  onExifQueryChange: (value: string) => void;
  onLoadExifTags: () => void;
  onReset: () => void;
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
        active ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function PinButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-sm border px-3 py-2 text-sm transition-colors ${
        active ? 'border-primary bg-primary/15 text-primary' : 'border-border text-foreground hover:border-primary/50'
      }`}
    >
      {children}
    </button>
  );
}

export default function SearchFilterDialog({
  isOpen,
  mode,
  nameQuery,
  pinMode,
  exifQuery,
  knownExifTags,
  filteredCount,
  totalCount,
  exifIndexedCount,
  exifLoading,
  onClose,
  onModeChange,
  onNameQueryChange,
  onPinModeChange,
  onExifQueryChange,
  onLoadExifTags,
  onReset,
}: SearchFilterDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center bg-black/35 px-6 pt-16">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-panel-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg text-foreground">전역 검색 / 필터</h2>
            <p className="mt-1 text-sm text-muted-foreground">파일 이름, 핀 여부, EXIF 태그 기준으로 목록을 걸러봅니다.</p>
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">
            <ModeButton active={mode === 'name'} onClick={() => onModeChange('name')}>
              파일 이름
            </ModeButton>
            <ModeButton active={mode === 'pin'} onClick={() => onModeChange('pin')}>
              핀 여부
            </ModeButton>
            <ModeButton active={mode === 'exif'} onClick={() => onModeChange('exif')}>
              EXIF 태그
            </ModeButton>
          </div>

          {mode === 'name' && (
            <section className="space-y-3 rounded-md border border-border bg-background/30 p-4">
              <h3 className="font-display text-sm text-foreground">파일 이름 필터</h3>
              <input
                value={nameQuery}
                onChange={(event) => onNameQueryChange(event.target.value)}
                placeholder="예: Isabelle, angry, armor"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
              />
              <p className="text-xs text-muted-foreground">파일명에 포함된 글자를 기준으로 좌측 목록과 하단 필름스트립을 걸러냅니다.</p>
            </section>
          )}

          {mode === 'pin' && (
            <section className="space-y-3 rounded-md border border-border bg-background/30 p-4">
              <h3 className="font-display text-sm text-foreground">핀 여부 필터</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                <PinButton active={pinMode === 'all'} onClick={() => onPinModeChange('all')}>
                  전체
                </PinButton>
                <PinButton active={pinMode === 'marked'} onClick={() => onPinModeChange('marked')}>
                  핀된 이미지
                </PinButton>
                <PinButton active={pinMode === 'unmarked'} onClick={() => onPinModeChange('unmarked')}>
                  핀 안 된 이미지
                </PinButton>
              </div>
              <p className="text-xs text-muted-foreground">현재 핀 상태를 기준으로 전역 이미지 목록을 좁힙니다.</p>
            </section>
          )}

          {mode === 'exif' && (
            <section className="space-y-4 rounded-md border border-border bg-background/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm text-foreground">EXIF 태그 필터</h3>
                  <p className="mt-1 text-xs text-muted-foreground">먼저 EXIF 태그를 읽어 온 뒤, 원하는 태그를 기준으로 목록을 걸러냅니다.</p>
                </div>
                <button
                  onClick={onLoadExifTags}
                  disabled={exifLoading}
                  className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {exifLoading && <Loader2 size={14} className="animate-spin" />}
                  EXIF 태그 불러오기
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-3">
                  <input
                    value={exifQuery}
                    onChange={(event) => onExifQueryChange(event.target.value)}
                    placeholder="예: brown hair, artist:nakta, best quality"
                    className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                  />
                  <div className="max-h-40 overflow-y-auto rounded-sm border border-dashed border-border p-3">
                    {knownExifTags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {knownExifTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => onExifQueryChange(tag)}
                            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                              exifQuery === tag
                                ? 'border-primary bg-primary/15 text-primary'
                                : 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">아직 불러온 EXIF 태그가 없습니다.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded-sm border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                  <p>읽은 EXIF 태그 세트: {exifIndexedCount}개 이미지</p>
                  <p>현재 입력: {exifQuery || '(없음)'}</p>
                  <p>필터는 메인 프롬프트와 캐릭터 프롬프트 태그를 기준으로 동작합니다.</p>
                </div>
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/30 px-4 py-3">
            <div className="text-sm text-foreground">
              필터 결과 <span className="font-display text-primary">{filteredCount}</span> / {totalCount}
            </div>
            <button
              onClick={onReset}
              className="rounded-sm border border-border px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/50"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

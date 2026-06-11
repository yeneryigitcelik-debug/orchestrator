# Android Mimarisi — ViewModel, Flow, katmanlar

Android'de UI yaşam döngüsü serttir (rotasyon, arka plan). Mimari, state'i UI'dan
ayırıp tek yönlü akış kurar — yoksa rotasyonda state kaybolur, sızıntı olur.

## Katmanlar
```
UI (Composable)  →  ViewModel  →  Repository  →  veri kaynağı (Room / Retrofit)
   state gözler      state tutar    veriyi birleştirir   ağ / yerel
```
- UI sadece state'i çizer + olayı ViewModel'e iletir.
- ViewModel iş mantığı + state'i; Repository veri erişimini soyutlar.

## State — ViewModel + StateFlow
```kotlin
class FeedViewModel(private val repo: FeedRepository) : ViewModel() {
  private val _ui = MutableStateFlow(FeedUiState(loading = true))
  val ui: StateFlow<FeedUiState> = _ui.asStateFlow()

  fun load() = viewModelScope.launch {
    _ui.update { it.copy(loading = true) }
    runCatching { repo.fetch() }
      .onSuccess { d -> _ui.update { it.copy(loading = false, items = d) } }
      .onFailure { e -> _ui.update { it.copy(loading = false, error = e.message) } }
  }
}
```
- Tek `UiState` data class — loading/data/error tek yerde, tutarlı.
- Composable'da: `val state by viewModel.ui.collectAsStateWithLifecycle()`.
- `viewModelScope` — ViewModel ölünce coroutine iptal; sızıntı yok.

## Coroutines & Flow
- Async iş = coroutine; `Dispatchers.IO` ağ/disk, `Default` CPU.
- Sürekli veri akışı = `Flow`; tek seferlik = `suspend fun`.
- `collectAsStateWithLifecycle` — UI arka plandayken toplamayı durdurur.

## DI — Hilt
- `@HiltViewModel`, `@Inject` — ViewModel/Repository bağımlılıkları.
- Bağımlılığı elle `new`'leme; test ve değiştirilebilirlik için DI kullan.

## Tek yönlü veri akışı (UDF)
State aşağı (ViewModel → UI), olay yukarı (UI → ViewModel). UI state'i mutasyona
uğratmaz; olay gönderir, ViewModel yeni state yayar.

## Ne yap
- Ekran state'i `ViewModel` + tek `UiState` + `StateFlow`.
- `collectAsStateWithLifecycle` ile topla; `viewModelScope` ile çalıştır.
- Veri erişimini `Repository` arkasına al; Hilt ile enjekte et.
- loading/error/empty `UiState`'in parçası olsun.

## Kırmızı bayraklar
- Ağ çağrısı doğrudan composable içinde — rotasyonda tekrar, sızıntı.
- State `Activity`/composable'da — konfig değişiminde kaybolur.
- `GlobalScope` ile coroutine — iptal edilmez, sızar.
- Retrofit/Room çağrısı UI thread'inde.
- ViewModel'in `Context`/`View` referansı tutması — bellek sızıntısı.

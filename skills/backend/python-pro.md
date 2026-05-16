# Python

Üretim kalitesinde, tipli ve idiomatik Python kodu yaz.

## Ne yap
- Bağımlılığı sanal ortamda izole et (`venv`/`uv`); sürümleri kilitle (`requirements.txt`/`uv.lock`/`poetry.lock`).
- Tip ipuçları (type hints) kullan; `mypy`/`pyright` ile doğrula.
- I/O ağırlıklı eşzamanlılık için `asyncio`; CPU ağırlığı için `multiprocessing` (GIL nedeniyle thread değil).
- Bağlam yöneticisi (`with`) ile dosya/bağlantı/lock'u garantili kapat.
- Veri sözleşmesi için `dataclass` veya `pydantic`; sözlük etrafında kod kurma.
- Hatayı spesifik exception ile yakala; `except Exception: pass` yapma.
- Format/lint için `ruff`, `black`; testte `pytest` + fixture.

## Kırmızı bayraklar
- Sistem Python'ına global `pip install` — ortam kirlenir.
- Çıplak `except:` veya hata yutma.
- CPU-bound işi thread'le hızlandırmaya çalışmak (GIL bloklar).
- Mutable default argument (`def f(x=[])`) — paylaşılan state hatası.
- String birleştirmeyle SQL kurmak — parametreli sorgu kullan.
- Tip ipucu yok, her şey `Any` — refactor ve IDE desteği kör.

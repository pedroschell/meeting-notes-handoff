CREATE TABLE IF NOT EXISTS atas_enviadas (
    chave        TEXT PRIMARY KEY,
    titulo       TEXT NOT NULL,
    data_reuniao TEXT NOT NULL,
    enviada_em   TEXT NOT NULL
);

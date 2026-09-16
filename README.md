# Meus Jogos — site com Sudoku

Site estático (HTML + CSS + JS puro, sem dependências) pronto para publicar
na web. Primeiro jogo: **Sudoku**, com 6 dificuldades, dicas, anotações,
cronômetro e contador de erros.

## Estrutura

```
sudoku-site/
├── index.html              -> página inicial (lista de jogos)
├── assets/
│   └── main.css             -> estilo da página inicial
├── games/
│   └── sudoku/
│       ├── index.html       -> o jogo em si
│       ├── style.css
│       └── script.js        -> gerador de tabuleiro + lógica do jogo
└── README.md                -> este arquivo
```

Para adicionar um novo jogo no futuro: crie uma pasta `games/nome-do-jogo/`
com seu próprio `index.html`, e adicione um novo card em `index.html` (na
raiz) copiando o bloco `<a class="game-card" ...>` do Sudoku.

## Testar antes de publicar

Basta abrir `index.html` duas vezes clicando nele — funciona sem servidor,
sem instalar nada.

---

## Passo a passo: publicar o site (sem depender do seu PC)

A forma mais simples e **100% gratuita** é o **GitHub Pages**. Ele hospeda o
site pra sempre, mesmo com o computador desligado.

### 1. Criar conta no GitHub
Acesse https://github.com e crie uma conta gratuita (se ainda não tiver).

### 2. Criar um repositório novo
- Clique em **New repository**.
- Dê um nome, por exemplo `meus-jogos`.
- Deixe como **Public**.
- Não marque "Add a README" (você já tem um).
- Clique em **Create repository**.

### 3. Enviar os arquivos
Na página do repositório recém-criado:
- Clique em **uploading an existing file** (ou "Add file" → "Upload files").
- Arraste a pasta `sudoku-site` inteira (ou todo o conteúdo dela: `index.html`,
  `assets/`, `games/`, `README.md`) para a área de upload.
- Role para baixo e clique em **Commit changes**.

*(Se preferir usar Git pela linha de comando, também funciona normalmente:
`git init`, `git add .`, `git commit -m "primeiro commit"`, `git push`.)*

### 4. Ativar o GitHub Pages
- No repositório, vá em **Settings** → **Pages** (menu lateral esquerdo).
- Em **Branch**, selecione `main` e a pasta `/ (root)`.
- Clique em **Save**.
- Aguarde 1–2 minutos. O GitHub vai te dar uma URL parecida com:
  `https://SEU-USUARIO.github.io/meus-jogos/`

Pronto — o site está no ar, público, e continua rodando mesmo com o seu
computador desligado, porque quem hospeda é o GitHub, não você.

> **Alternativa ainda mais simples:** [Vercel](https://vercel.com) ou
> [Netlify](https://netlify.com) — crie uma conta, arraste a pasta do site
> na tela de deploy (drag-and-drop) e pronto, sem precisar mexer com Git.
> Ambos também têm plano gratuito para sites estáticos como este.

---

## Passo a passo: ganhar dinheiro com anúncios (Google AdSense)

Para exibir anúncios você precisa do **Google AdSense**, que só aprova sites
que já estão publicados (por isso faça o deploy acima primeiro).

### 1. Ter o site publicado com uma URL pública
Use a URL do GitHub Pages/Vercel/Netlify do passo anterior.

### 2. Criar conta no AdSense
- Acesse https://adsense.google.com.
- Cadastre-se com sua conta Google e informe a URL do seu site.
- O Google vai revisar o site (pode levar de alguns dias a algumas semanas).
  Ele verifica coisas como: conteúdo original, política de privacidade,
  navegação funcionando, sem conteúdo proibido. Times de aprovação costumam
  pedir pelo menos uma página com **Política de Privacidade** — vale
  adicionar uma (posso te ajudar a gerar uma, se quiser).

### 3. Depois de aprovado: pegar o código do anúncio
No painel do AdSense, crie um **bloco de anúncio** (ad unit) e copie o
trecho de código `<script>` / `<ins class="adsbygoogle">` que o Google
gerar.

### 4. Colar o código no site
No projeto, os lugares reservados para anúncio já estão marcados com
comentários `<!-- AD_SLOT_TOP -->` e `<!-- AD_SLOT_BOTTOM -->`, dentro da
`<div class="ad-slot ...">`, em:
- `index.html` (página inicial)
- `games/sudoku/index.html` (dentro do jogo)

Basta colar o código do Google dentro dessas divs, no lugar do comentário.
O script principal do AdSense (o que carrega a biblioteca, começa com
`<script async src="https://pagead2.googlesyndication.com/...">`) deve ir
uma vez em cada página, dentro do `<head>`.

### 5. Publicar de novo
Depois de colar os códigos, suba os arquivos atualizados de novo pro GitHub
(edite direto pelo site do GitHub ou repita o upload) — o ar muda em
poucos minutos.

---

## Ideias de próximos passos
- Registrar um domínio próprio (tipo `meusjogos.com`) e apontar pro GitHub
  Pages/Vercel — deixa o site mais profissional.
- Adicionar mais jogos na pasta `games/`.
- Criar uma página de política de privacidade (exigida pelo AdSense).


# SISTEMA DE ACERTO PARA TRANSPORTE

Interface moderna **verde e preta**, separada em **Empresa** e **Motorista**, 100% offline (localStorage), pronta para o **GitHub Pages**.

## Páginas
- `index.html` — escolha de área (Empresa/Motorista).
- `empresa.html` — login/cadastro (Empresa), criação de viagens, lançamento de **fretes** (valor bruto + % motorista) e **adiantamentos** (com **upload de comprovante** -> link clicável), resumo do acerto.
- `motorista.html` — login/cadastro (Motorista), visualização das viagens dele (somente leitura) e **Simulação de Ganhos** (frete/%, adiantamento e acumulado).

## Como usar localmente
1. Abra `index.html` no navegador.
2. Crie conta em `empresa.html` (tipo Empresa) e em `motorista.html` (tipo Motorista).
3. Na Empresa, crie Viagem → adicione Fretes e Adiantamentos (com comprovante).
4. No Motorista, veja suas viagens e utilize o **Simulador** para prever ganhos.

## Publicar no GitHub Pages
1. Crie um repositório e envie todos os arquivos para a **raiz**.
2. Em **Settings → Pages**: “Deploy from a branch” → `main` → `/ (root)`.
3. Acesse a URL fornecida pelo GitHub Pages.

> **Observação**: Dados e credenciais ficam no navegador do usuário (localStorage). Para uso multiusuário/online, adapte para um backend (por exemplo, Firebase).

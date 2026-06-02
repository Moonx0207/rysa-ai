import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
SYSTEM_PROMPT = """
INSTRUÇÃO PRINCIPAL:
Siga exatamente as regras abaixo. Se houver conflito entre estilos de resposta, prefira estas instruções.

Você é um professor de programação para iniciantes brasileiros.

FOCO E LIMITES:
Responda apenas perguntas relacionadas a programação, tecnologia e computação.
Se o usuário perguntar algo fora desses temas, diga gentilmente que você só pode ajudar com programação e convide-o a fazer uma pergunta da área.

LINGUAGEM:
Use português brasileiro simples e informal, como um amigo explicando.
Evite jargões técnicos. Quando precisar usar um termo técnico, explique o que ele significa logo em seguida.
Seja paciente, encorajador e nunca faça o usuário se sentir burro por não saber algo.
Prefira frases curtas e quebras de linha naturais, para que a resposta apareça de forma gradual na interface.

FORMATO DE RESPOSTA — SIGA RIGOROSAMENTE:
Use markdown de forma moderada quando isso ajudar a deixar a resposta mais clara, especialmente para negrito e blocos de código.
Escreva em parágrafos normais separados por uma linha em branco.
Quando quiser dar ênfase a uma palavra, escreva ela em MAIÚSCULAS.
Para listas, escreva assim: "Primeiro, ... Segundo, ... Terceiro, ..."
Para mostrar código, escreva assim:

Exemplo de código:
print("olá mundo")

Sempre deixe uma linha em branco antes e depois do exemplo de código.
Nunca comece a resposta com saudação como "Olá!" ou "Claro!". Vá direto ao ponto.
Termine sempre com uma frase de encorajamento ou uma pergunta para verificar se o usuário entendeu.

ESTRUTURA IDEAL DE CADA RESPOSTA:
Parágrafo 1: explicação do conceito em linguagem simples. Uma ou duas frases.

Parágrafo 2: analogia com algo do dia a dia para fixar o conceito.

Parágrafo 3: exemplo prático em código, precedido pela frase "Veja como fica na prática:"

Veja como fica na prática:

[código aqui, sem markdown, indentado com espaços]

Parágrafo 4: explicação do que o código faz, linha por linha se necessário.

Frase final: encorajamento ou pergunta de verificação.

IMAGENS:
Se o usuário enviar uma imagem com código ou erro, analise com atenção e explique o que está acontecendo de forma clara, seguindo o mesmo formato acima.

EXEMPLOS DE RESPOSTA ERRADA E CERTA:

ERRADO:
## O que é uma variável?
Uma variavel é um espaço na memória que armazena um valor.
Pode guardar números
Pode guardar texto

CERTO:
Uma **variável** é como uma caixinha com um nome escrito nela. Você coloca um valor dentro dessa caixinha e pode pegar esse valor de volta sempre que precisar.

Pense em uma variável como uma gaveta de armário. Você escolhe o nome da gaveta, coloca algo dentro, e depois abre pelo nome quando quiser usar.

Veja como fica na prática:

    nome = "João"
    idade = 25
    print(nome)

Aqui criamos duas variáveis. A primeira guarda um texto chamado "João" e a segunda guarda o número 25. Quando chamamos print, o Python abre a caixinha e mostra o que está dentro.

Ficou claro? Quer tentar criar uma variável você mesmo?
"""

historico = [
    {"role": "system", "content": SYSTEM_PROMPT},
]

app = FastAPI(title="Rysa AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


def limpar_historico() -> None:
    historico[:] = [{"role": "system", "content": SYSTEM_PROMPT}]


def get_client() -> Groq:
    load_dotenv()

    api_key = os.getenv("GROQ_API_KEY") or os.getenv("groq_api_key")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing Groq credentials. Set GROQ_API_KEY in your environment or .env file.",
        )

    return Groq(api_key=api_key)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    client = get_client()
    historico.append({"role": "user", "content": request.message})

    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            temperature=0.0,
            top_p=1.0,
            frequency_penalty=0,
            presence_penalty=0,
            messages=historico,
        )
    except Exception as error:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail="Erro ao consultar a IA. Verifique sua chave, quota e conexão.",
        ) from error

    reply = completion.choices[0].message.content or ""
    historico.append({"role": "assistant", "content": reply})
    return ChatResponse(reply=reply)


def main() -> None:
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[os.path.dirname(__file__)],
    )


if __name__ == "__main__":
    main()
# BACK-END FLASK: ROTAS DA API REST

from flask import Flask, jsonify, request
from flask_cors import CORS
from database import init_db, get_connection

# Cria uma instancia da aplicação Flask
app = Flask(__name__, static_folder='static', static_url_path='')

# Habilitar os CORS
CORS(app)

# ROTA N1 - Página Inicial
@app.route('/')
def index():
    # Alimenta o arquivo index.html da pasta static
    return app.send_static_file('index.html')

# ROTA N2 - Status API
@app.route('/status')
def status():
    """Rota de Verificação da API (Saúde)
    Retornar um JSON informando que o servidor está ativo"""
    return jsonify({
        "status": "online",
        "sistema": "Sistema de ordem de Produção",
        "versao": "1.0.0",
        "mensagem": "Ola, Fabrica, API FUNCIONANDO"
    })

# ROTA N3 - Listar todas as ordens (GET)
@app.route('/ordens', methods=['GET'])
def listar_ordens():
    """
    Listar todas as ordens de produção cadastradas.
    Métodos HTTP: GET
    URL: http://localhost:5000/ordens
    Retorna: Lista e ordens em formato JSON.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM ordens ORDER BY id DESC')
    ordens = cursor.fetchall()
    conn.close()
    
    # Converte cada Row do SQLite em dicionário Python para serializar em JSON
    return jsonify([dict(o) for o in ordens])

# ROTA POR ID - BUSCAR UMA ORDEM ESPECIFICA PELO ID (GET)
@app.route('/ordens/<int:ordem_id>', methods=['GET'])
def buscar_ordem(ordem_id):
    """
    Buscar uma única ordem de produção pelo ID.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # CORRIGIDO: Nome da tabela é 'ordens' e adicionada a vírgula na tupla
    cursor.execute('SELECT * FROM ordens WHERE id = ?', (ordem_id,))
    ordem = cursor.fetchone() # Ele retorna um único registro ou None
    conn.close()
    
    # Se o ID nao existir, retornamos 404
    if ordem is None:
        return jsonify({'erro': f'Ordem {ordem_id} nao encontrada.'}), 404
    
    return jsonify(dict(ordem)), 200

# ROTA: CRIAR NOVA ORDEM DE PRODUÇÃO
@app.route('/ordens', methods=['POST'])
def criar_ordem():
    """
    Cria uma nova ordem de produção a partir dos dados JSON enviados.
    """
    dados = request.get_json()
    
    if not dados:
        return jsonify({'erro': 'Body da requisicao ausente ou invalido'}), 400
    
    # Verificação de Campo Obrigatório (produto)
    produto = dados.get('produto')
    if not produto:
        return jsonify({'erro': 'Campo "Produto" e obrigatorio e não pode ser vazio.'}), 400
    
    # Verificação de Campo Obrigatório (quantidade)
    quantidade = dados.get('quantidade')
    if quantidade is None:
        return jsonify({'erro': 'Campo "quantidade" e obrigatorio.'}), 400
    
    # Verifica se quantidade é um número inteiro e positivo
    try:
        quantidade = int(quantidade)
        if quantidade <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        # CORRIGIDO: Adicionado o , 400 no final
        return jsonify({'erro': 'Campo "quantidade" deve ser um número inteiro e positivo.'}), 400
    
    # Status (*pendentes, em andamento, concluída) - opcional
    status_validos = ['Pendente', 'Em andamento', 'Concluida']
    status = dados.get('status', 'Pendente')
    if status not in status_validos:
        return jsonify({'erro': f'Status invalido. Use {status_validos}'}), 400
    
    # Inserção dos dados no banco
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute (
        'INSERT INTO ordens (produto, quantidade, status) VALUES (?, ?, ?)',
        (produto, quantidade, status)
    )
    conn.commit()

    # Recuperando o ID que é gerado automaticamente pelo banco
    novo_id = cursor.lastrowid
    
    # CORRIGIDO: Nome da tabela é 'ordens' (estava ordem_id)
    cursor.execute('SELECT * FROM ordens WHERE id = ?', (novo_id,))
    nova_ordem = cursor.fetchone()
    
    conn.close()
    
    # 201 - Retornar "created" com o registro completo
    return jsonify(dict(nova_ordem)), 201

# ----------------------------------------- PONTO DE PARTIDA -----------------------------------------
if __name__== '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
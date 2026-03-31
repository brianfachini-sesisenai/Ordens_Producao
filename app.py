#BACK-END FLASK: ROTAS DA API REST

from flask import Flask, jsonify, request
from flask_cors import CORS
from database import init_db, get_connection

# Cria uma instancia da aplicação Flash
app = Flask(__name__, static_folder='static', static_url_path='')

# Habilitar os CORS
CORS(app)

# ROTA N1 - Página Inicial
@app.route('/')
def index():
    # Alimentas o arquivo index.html da pasta static
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
# ROTA N3 - Listar todas as ordens(get)
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

# Ponto de Partida

if __name__=='__main__':
    init_db()
    
    app.run(debug=True, host='0.0.0.0', port='5000')
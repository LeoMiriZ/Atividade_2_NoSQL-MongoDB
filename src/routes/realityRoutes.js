const express = require('express');
const router = express.Router();
const realityController = require('../controllers/realityController');

router.get('/', (req, res) => {
    res.json({
        message: 'Bem-vindo à API do Reality Show!',
        timestamp: new Date().toISOString(),
        rotas_disponiveis: [
            '/premios',
            '/idade/:nome_reality',
            '/maior/:valor',
            '/total',
            '/audiencia',
            '/votar/:realityNome/:participanteNome (PATCH)',
            '/votos/:realityNome'
        ]
    });
});

router.get('/premios', realityController.getPremios);
router.get('/idade/:nome_reality', realityController.getIdadeInfo);
router.get('/maior/:valor', realityController.getPremioMaiorValor);
router.get('/total', realityController.getTotalPremios);
router.get('/audiencia', realityController.getAudiencia);

router.patch('/votar/:realityNome/:participanteNome', realityController.computarVoto);
router.get('/votos/:realityNome', realityController.getVotos);

module.exports = router;
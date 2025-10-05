const { connectToDb } = require('../config/database');

async function getCollection() {
    const db = await connectToDb();
    return db.collection('reality_shows');
}

exports.getPremios = async (req, res) => {
    try {
        const collection = await getCollection();
        const projection = {
            _id: 0,
            nome: 1,
            'participantes.nome': 1,
            'participantes.idade': 1,
            'participantes.premios_ganhos': 1,
        };
        const data = await collection.find({}).project(projection).toArray();
        res.json(data);
    } catch (err) {
        console.error("ERRO em getPremios:", err);
        res.status(500).json({ message: "Erro ao buscar dados dos prêmios", error: err.message });
    }
};

exports.getIdadeInfo = async (req, res) => {
    try {
        const collection = await getCollection();
        const { nome_reality } = req.params;
        const pipeline = [
            { $match: { nome: new RegExp(`^${nome_reality}$`, 'i') } },
            { $unwind: "$participantes" },
            { $sort: { "participantes.idade": 1 } },
            { $group: { _id: "$nome", mais_novo: { $first: "$participantes" }, mais_velho: { $last: "$participantes" } } },
            { $project: { _id: 0, reality_show: "$_id", participante_mais_novo: { nome: "$mais_novo.nome", idade: "$mais_novo.idade" }, participante_mais_velho: { nome: "$mais_velho.nome", idade: "$mais_velho.idade" } } }
        ];
        const result = await collection.aggregate(pipeline).toArray();
        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).json({ message: "Reality show não encontrado." });
        }
    } catch (err) {
        console.error("ERRO em getIdadeInfo:", err);
        res.status(500).json({ message: "Erro ao buscar informações de idade", error: err.message });
    }
};

exports.getPremioMaiorValor = async (req, res) => {
    try {
        const collection = await getCollection();
        const valorMinimo = parseFloat(req.params.valor);

        const pipeline = [
            { $match: { "participantes.premios_ganhos.valor": { $gte: valorMinimo } } },
            { $unwind: "$participantes" },
            {
                $addFields: {
                    "participantes.premios_ganhos": {
                        $filter: {
                            input: "$participantes.premios_ganhos",
                            as: "premio",
                            cond: { $gte: ["$$premio.valor", valorMinimo] }
                        }
                    }
                }
            },
            { $match: { "participantes.premios_ganhos": { $ne: [] } } },
            {
                $group: {
                    _id: "$_id",
                    nome: { $first: "$nome" },
                    emissora: { $first: "$emissora" },
                    participantes: { $push: "$participantes" }
                }
            },
            {
                $project: {
                    _id: 0,
                    nome: 1,
                    emissora: 1,
                    "participantes.nome": 1,
                    "participantes.premios_ganhos": 1
                }
            }
        ];

        const result = await collection.aggregate(pipeline).toArray();
        res.json(result);
    } catch (err) {
        console.error("ERRO em getPremioMaiorValor:", err);
        res.status(500).json({ message: "Erro ao buscar prêmios por valor", error: err.message });
    }
};

exports.getTotalPremios = async (req, res) => {
    try {
        const collection = await getCollection();
        const pipeline = [
            { $unwind: "$participantes" },
            { $unwind: "$participantes.premios_ganhos" },
            {
                $facet: {
                    "totais_por_reality": [
                        { $group: { _id: "$nome", total: { $sum: 1 } } },
                        { $project: { _id: 0, reality_show: "$_id", total_premios: "$total" } }
                    ],
                    "total_geral": [
                        { $count: "soma_total" }
                    ]
                }
            },
            {
                $project: {
                    _id: 0,
                    totais_por_reality: "$totais_por_reality",
                    total_geral: { $arrayElemAt: ["$total_geral.soma_total", 0] }
                }
            }
        ];
        const result = await collection.aggregate(pipeline).toArray();
        res.json(result[0]);
    } catch (err) {
        console.error("ERRO em getTotalPremios:", err);
        res.status(500).json({ message: "Erro ao calcular total de prêmios", error: err.message });
    }
};

exports.getAudiencia = async (req, res) => {
    try {
        const collection = await getCollection();
        const pipeline = [
            { $group: { _id: "$emissora", total_audiencia_pontos: { $sum: "$audiencia_pontos" } } },
            { $project: { _id: 0, emissora: "$_id", total_audiencia: "$total_audiencia_pontos" } }
        ];
        const result = await collection.aggregate(pipeline).toArray();
        res.json(result);
    } catch (err) {
        console.error("ERRO em getAudiencia:", err);
        res.status(500).json({ message: "Erro ao calcular audiência", error: err.message });
    }
};

exports.computarVoto = async (req, res) => {
    try {
        const collection = await getCollection();
        const { realityNome, participanteNome } = req.params;
        const result = await collection.updateOne(
            { 
                "nome": new RegExp(`^${realityNome}$`, 'i'), 
                "participantes.nome": new RegExp(`^${participanteNome}$`, 'i') 
            },
            { 
                $inc: { "participantes.$.total_votos": 1 } 
            }
        );
        if (result.modifiedCount > 0) {
            res.json({ message: "Voto computado com sucesso!" });
        } else {
            res.status(404).json({ message: "Reality show ou participante não encontrado." });
        }
    } catch (err) {
        console.error("ERRO em computarVoto:", err);
        res.status(500).json({ message: "Erro ao computar voto", error: err.message });
    }
};

exports.getVotos = async (req, res) => {
    try {
        const collection = await getCollection();
        const { realityNome } = req.params;
        const reality = await collection.findOne(
            { nome: new RegExp(`^${realityNome}$`, 'i') },
            { 
                projection: { 
                    _id: 0, 
                    "participantes.nome": 1, 
                    "participantes.total_votos": 1
                } 
            }
        );
        if (reality && reality.participantes) {
            res.json(reality.participantes);
        } else {
            res.status(404).json({ message: "Reality show não encontrado ou sem participantes." });
        }
    } catch (err) {
        console.error("ERRO em getVotos:", err);
        res.status(500).json({ message: "Erro ao buscar votos", error: err.message });
    }
};
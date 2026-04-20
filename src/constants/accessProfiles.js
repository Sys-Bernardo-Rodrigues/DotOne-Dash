/**
 * Perfis de acesso exibidos no cadastro de usuários (alinhado ao servidor).
 */
export const PERFIS_ACESSO = [
  {
    value: "Administrador",
    resumo: "Acesso total ao painel administrativo",
    detalhe:
      "Usuários, clientes, exclusões e configurações operacionais. Indicado para donos da conta ou TI.",
  },
  {
    value: "Gestor",
    resumo: "Gestão de clientes e visão de equipe",
    detalhe:
      "Pode criar e remover clientes e ver usuários. Não remove usuários do sistema (reduz risco de bloqueio acidental).",
  },
  {
    value: "Operador",
    resumo: "Operação do dia a dia",
    detalhe:
      "Consulta listas de usuários e clientes. Ideal para suporte ou equipe que alimenta dados sem alterar estrutura sensível.",
  },
  {
    value: "Visualizador",
    resumo: "Somente leitura",
    detalhe:
      "Apenas visualiza usuários e clientes. Não cria nem exclui registros.",
  },
];

export const PERFIS_VALUES = PERFIS_ACESSO.map((p) => p.value);

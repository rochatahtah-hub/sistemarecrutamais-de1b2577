/**
 * Mock mínimo do query builder do Supabase para testes unitários.
 *
 * Qualquer método encadeado (select/eq/is/neq/order/limit/update/insert/...)
 * retorna o próprio mock; ao dar `await` nele, resolve com `resultado`.
 * Não faz nenhuma chamada de rede — nenhum teste que usa isto toca o banco real.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- imita um builder encadeável arbitrário (from().select().eq()...); tipar isso replicaria o generic inteiro do PostgrestFilterBuilder do Supabase.
type ChainMock = any;

export function chainResolvendo(resultado: { data?: unknown; error?: unknown }): ChainMock {
  const proxy: ChainMock = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve(resultado);
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

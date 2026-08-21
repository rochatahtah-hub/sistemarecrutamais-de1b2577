import {describe,it,expect} from "vitest";
import {interpretarFicha} from "@/lib/ficha-texto";
describe("pix",()=>{
 for(const v of ["086.723.953-01","exemplo@email.com","123e4567-e89b-12d3-a456-426614174000"]) {
  it(v,()=>{expect(interpretarFicha(`Nome completo: Joao da Silva\nChave Pix (obrigatório ser no seu nome): ${v}`).pix).toBe(v)});
  it(v+" linha seguinte",()=>{expect(interpretarFicha(`Chave Pix (obrigatório ser no seu nome):\n${v}`).pix).toBe(v)});
 }
});

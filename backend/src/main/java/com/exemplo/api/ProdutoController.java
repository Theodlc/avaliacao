package com.exemplo.api;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// CORS liberado para o frontend (aberto em outra origem) conseguir chamar a API
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/produtos")
public class ProdutoController {

    // "Banco de dados" em memória: os dados somem quando o servidor é reiniciado
    private final Map<Long, Produto> banco = new ConcurrentHashMap<>();
    private final AtomicLong proximoId = new AtomicLong(1);

    // GET /produtos -> lista todos
    @GetMapping
    public List<Produto> listar() {
        return new ArrayList<>(banco.values());
    }

    // GET /produtos/{id} -> busca um
    @GetMapping("/{id}")
    public ResponseEntity<Produto> buscar(@PathVariable Long id) {
        Produto produto = banco.get(id);
        if (produto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(produto);
    }

    // POST /produtos -> cadastra (o id é gerado aqui, no backend)
    @PostMapping
    public ResponseEntity<Produto> cadastrar(@RequestBody Produto produto) {
        produto.setId(proximoId.getAndIncrement());
        banco.put(produto.getId(), produto);
        return ResponseEntity.status(HttpStatus.CREATED).body(produto);
    }

    // PUT /produtos/{id} -> atualiza
    @PutMapping("/{id}")
    public ResponseEntity<Produto> atualizar(@PathVariable Long id, @RequestBody Produto produto) {
        if (!banco.containsKey(id)) {
            return ResponseEntity.notFound().build();
        }
        produto.setId(id);
        banco.put(id, produto);
        return ResponseEntity.ok(produto);
    }

    // DELETE /produtos/{id} -> exclui
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        if (banco.remove(id) == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}

package com.sean.blog.module.ai.service;

import org.apache.lucene.document.*;
import org.apache.lucene.index.*;
import org.apache.lucene.search.*;
import org.apache.lucene.store.FSDirectory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * LuceneVectorService — 基于 Lucene HNSW 索引的向量存储与检索
 *
 * 存储：KnnFloatVectorField（余弦相似度）
 * 检索：KnnFloatVectorQuery + IndexSearcher
 * 持久化：FSDirectory → 磁盘文件，服务重启后索引不丢失
 *
 * 资源消耗：内存 ~50MB，磁盘 ~每万条向量 60MB（1536 维），适合 2C2G 服务器
 */
@Service
public class LuceneVectorService {

    private static final Logger log = LoggerFactory.getLogger(LuceneVectorService.class);

    private final Path indexPath;
    private IndexWriter writer;

    /** 向量维度，与 embedding 模型输出维度一致 */
    public static final int VECTOR_DIM = 1536;

    /** HNSW 图的连接数，默认 16，越大精度越高但索引越大 */
    private static final int HNSW_M = 16;

    /** HNSW 构建时搜索宽度 */
    private static final int HNSW_EF_CONSTRUCTION = 200;

    public LuceneVectorService(@Value("${vector.index-path:/data/lucene-index}") String indexPath) {
        this.indexPath = Path.of(indexPath);
    }

    /**
     * 服务启动时初始化 IndexWriter，确保索引目录存在
     */
    @PostConstruct
    public void init() throws IOException {
        var dir = FSDirectory.open(indexPath);

        var config = new IndexWriterConfig()
                .setOpenMode(IndexWriterConfig.OpenMode.CREATE_OR_APPEND);

        writer = new IndexWriter(dir, config);
        log.info("Lucene vector index initialized at {}, docs={}", indexPath, writer.getDocStats().numDocs);
    }

    /**
     * 服务关闭时提交并释放 IndexWriter
     */
    @PreDestroy
    public void destroy() {
        try {
            if (writer != null && writer.isOpen()) {
                writer.commit();
                writer.close();
                log.info("Lucene vector index closed, docs={}", writer.getDocStats().numDocs);
            }
        } catch (IOException e) {
            log.error("Failed to close Lucene index writer", e);
        }
    }

    // -----------------------------------------------------------------------
    // 写入
    // -----------------------------------------------------------------------

    /**
     * 将一条文档（ID + 文本 + 向量）写入索引
     *
     * @param docId  文档唯一 ID（如文章 ID）
     * @param title  文档标题
     * @param content 文档内容摘要
     * @param vector 嵌入向量（维度必须 = VECTOR_DIM）
     */
    public void index(String docId, String title, String content, float[] vector) throws IOException {
        if (vector.length != VECTOR_DIM) {
            throw new IllegalArgumentException(
                    "Vector dimension mismatch: expected " + VECTOR_DIM + ", got " + vector.length);
        }

        // 先删除同 ID 旧文档（实现 upsert）
        writer.deleteDocuments(new Term("id", docId));

        Document doc = new Document();
        doc.add(new StringField("id", docId, Field.Store.YES));
        doc.add(new TextField("title", title, Field.Store.YES));
        doc.add(new StoredField("content", content));
        doc.add(new KnnFloatVectorField("vector", vector, VectorSimilarityFunction.COSINE));

        writer.addDocument(doc);
        writer.commit();

        log.debug("Indexed document id={}, title={}", docId, title);
    }

    /**
     * 批量删除指定 ID 的文档
     */
    public void deleteByIds(List<String> docIds) throws IOException {
        Term[] terms = docIds.stream()
                .map(id -> new Term("id", id))
                .toArray(Term[]::new);
        writer.deleteDocuments(terms);
        writer.commit();
        log.debug("Deleted {} documents from index", docIds.size());
    }

    /**
     * 重建整个索引（清空后重新写入）
     */
    public void rebuild(List<DocEntry> entries) throws IOException {
        writer.deleteAll();
        for (var entry : entries) {
            Document doc = new Document();
            doc.add(new StringField("id", entry.id(), Field.Store.YES));
            doc.add(new TextField("title", entry.title(), Field.Store.YES));
            doc.add(new StoredField("content", entry.content()));
            doc.add(new KnnFloatVectorField("vector", entry.vector(), VectorSimilarityFunction.COSINE));
            writer.addDocument(doc);
        }
        writer.commit();
        log.info("Rebuilt index with {} documents", entries.size());
    }

    // -----------------------------------------------------------------------
    // 检索
    // -----------------------------------------------------------------------

    /**
     * 向量相似度检索，返回最相关的 k 条文档
     *
     * @param queryVector 查询向量
     * @param k           返回数量
     * @return 相关文档列表（按相似度降序）
     */
    public List<SearchResult> search(float[] queryVector, int k) throws IOException {
        if (writer.getDocStats().numDocs == 0) {
            return List.of();
        }

        try (var reader = DirectoryReader.open(writer)) {
            var searcher = new IndexSearcher(reader);
            var query = new KnnFloatVectorQuery("vector", queryVector, k);
            var topDocs = searcher.search(query, k);

            var results = new ArrayList<SearchResult>();
            for (var sd : topDocs.scoreDocs) {
                var doc = searcher.storedFields().document(sd.doc);
                results.add(new SearchResult(
                        doc.get("id"),
                        doc.get("title"),
                        doc.get("content"),
                        sd.score
                ));
            }
            return results;
        }
    }

    /**
     * 获取当前索引中的文档数
     */
    public int docCount() {
        return writer.getDocStats().numDocs;
    }

    // -----------------------------------------------------------------------
    // 数据类
    // -----------------------------------------------------------------------

    /** 批量索引条目 */
    public record DocEntry(String id, String title, String content, float[] vector) {}

    /** 检索结果 */
    public record SearchResult(String id, String title, String content, float score) {}
}

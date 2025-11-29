const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

const app = express();

// In-memory data
let books = [
  {
    id: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    year: 1925,
    genre: 'Novel'
  },
  {
    id: '2',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    year: 1960,
    genre: 'Southern Gothic'
  }
];

// GraphQL Schema (fixed + mutations added)
const schema = buildSchema(`
  input BookInput {
    title: String!
    author: String!
    year: Int!
    genre: String
  }

  type Book {
    id: ID!
    title: String!
    author: String!
    year: Int!
    genre: String
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book
    searchBooks(query: String!): [Book!]!
  }

  type Mutation {
    addBook(input: BookInput!): Book!
    updateBook(id: ID!, input: BookInput!): Book
    deleteBook(id: ID!): Boolean!
  }
`);

// Resolvers
const root = {
  // Queries
  books: () => books,

  book: ({ id }) => books.find(b => b.id === id),

  searchBooks: ({ query }) => {
    const term = query.toLowerCase();
    return books.filter(book =>
      book.title.toLowerCase().includes(term) ||
      book.author.toLowerCase().includes(term)
    );
  },

  // Mutations
  addBook: ({ input }) => {
    const newBook = {
      id: String(books.length + 1),
      ...input
    };
    books.push(newBook);
    return newBook;
  },

  updateBook: ({ id, input }) => {
    const book = books.find(b => b.id === id);
    if (!book) throw new Error("Book not found");

    Object.assign(book, input);
    return book;
  },

  deleteBook: ({ id }) => {
    const index = books.findIndex(b => b.id === id);
    if (index === -1) return false;

    books.splice(index, 1);
    return true;
  }
};

// Route
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true  // Open http://localhost:4000 → you get playground!
}));

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`GraphQL Server running at http://localhost:${PORT}`);
  console.log(`Open GraphiQL → http://localhost:${PORT}`);
});
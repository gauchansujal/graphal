const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema, GraphQLError } = require('graphql');
const DataLoader = require('dataloader');

const app = express();

// In-memory data store
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

// GraphQL Schema
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

// DataLoader for batching and caching book lookups (N+1 prevention)
const bookLoader = new DataLoader(async (ids) => {
  console.log('DataLoader batch loading IDs:', ids);
  return ids.map(id => books.find(book => book.id === id) || null);
});

// Root Resolvers
const root = {
  // === Queries ===
  books: () => books,

  book: ({ id }) => bookLoader.load(id),

  searchBooks: ({ query }) => {
    const term = query.toLowerCase();
    return books.filter(book =>
      book.title.toLowerCase().includes(term) ||
      book.author.toLowerCase().includes(term)
    );
  },

  // === Mutations ===
  addBook: ({ input }) => {
    // Validation: year must be reasonable
    const currentYear = new Date().getFullYear();
    if (input.year < 0 || input.year > currentYear + 5) {
      throw new GraphQLError('Invalid publication year', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }

    const newBook = {
      id: String(books.length + 1),
      ...input
    };
    books.push(newBook);
    // Optionally clear/invalidate loader cache if needed
    bookLoader.clear(newBook.id).prime(newBook.id, newBook);
    return newBook;
  },

  updateBook: ({ id, input }) => {
    const book = books.find(b => b.id === id);
    if (!book) {
      throw new GraphQLError('Book not found', {
        extensions: { code: 'NOT_FOUND' }
      });
    }

    // Validate year if provided
    if (input.year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (input.year < 0 || input.year > currentYear + 5) {
        throw new GraphQLError('Invalid publication year', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }
    }

    Object.assign(book, input);
    bookLoader.clear(id).prime(id, book); // Update cache
    return book;
  },

  deleteBook: ({ id }) => {
    const index = books.findIndex(b => b.id === id);
    if (index === -1) {
      return false;
    }
    books.splice(index, 1);
    bookLoader.clear(id); // Remove from cache
    return true;
  }
};

// Middleware
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true, // Built-in GraphQL IDE
}));

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`GraphQL server running at http://localhost:${PORT}/graphql`);
  console.log(`Open GraphiQL → http://localhost:${PORT}/graphql`);
});
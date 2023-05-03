// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.18.0
// source: porter_app_revisions.sql

package queries

import (
	"context"
)

const createPorterAppRevision = `-- name: CreatePorterAppRevision :one
INSERT INTO porter_app_revisions 
(project_id, base64_contract) 
VALUES 
($1, $2) RETURNING id, created_at, updated_at, deleted_at, base64_contract, project_id
`

type CreatePorterAppRevisionParams struct {
	ProjectID      int64
	Base64Contract string
}

func (q *Queries) CreatePorterAppRevision(ctx context.Context, arg CreatePorterAppRevisionParams) (PorterAppRevision, error) {
	row := q.db.QueryRowContext(ctx, createPorterAppRevision, arg.ProjectID, arg.Base64Contract)
	var i PorterAppRevision
	err := row.Scan(
		&i.ID,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.DeletedAt,
		&i.Base64Contract,
		&i.ProjectID,
	)
	return i, err
}

const porterAppRevisionsForProject = `-- name: PorterAppRevisionsForProject :many
SELECT id, created_at, updated_at, deleted_at, base64_contract, project_id FROM porter_app_revisions
WHERE project_id = $1 AND deleted_at IS NULL
`

func (q *Queries) PorterAppRevisionsForProject(ctx context.Context, projectID int64) ([]PorterAppRevision, error) {
	rows, err := q.db.QueryContext(ctx, porterAppRevisionsForProject, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []PorterAppRevision
	for rows.Next() {
		var i PorterAppRevision
		if err := rows.Scan(
			&i.ID,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.DeletedAt,
			&i.Base64Contract,
			&i.ProjectID,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
